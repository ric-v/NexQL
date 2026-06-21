import * as vscode from 'vscode';
import { IndexStore } from './IndexStore';
import { IndexManifest, ObjectEntry, TokenIndex, JoinGraph, EmbeddingMetaEntry } from './types';
import { tokenize, scoreObject, candidateRefsFromPostings } from './lexical';
import { findShortestJoinPath } from './joinPath';
import { ProFeature, isProFeatureEnabled } from '../../services/featureGates';
import { buildContextPack } from './contextPack';
import { cosineSimilarity, deserializeEmbedding } from './embeddings';
import { generateEmbedding } from './embeddings';

export interface RankedHit {
  ref: string;
  score: number;
  kind: string;
}

export interface RankedContext {
  packMarkdown: string;
  objects: Array<{ ref: string; score: number; detail: 'full' | 'columns' | 'skeleton' }>;
  joinHints: string[];
  tokensUsed: number;
  staleness: {
    indexedAt: string;
    fingerprintMatch: boolean;
  };
}

export class IndexQueryService {
  private lastQuery: string = '';
  private lastEmbedVector: number[] | null = null;

  constructor(private readonly store: IndexStore) {}

  /**
   * High-level schema retrieval to ground chat inputs.
   * Returns null if no index exists for the connection/database.
   */
  public async retrieve(
    connectionId: string,
    database: string,
    question: string,
    budgetTokens: number,
    config: vscode.WorkspaceConfiguration
  ): Promise<RankedContext | null> {
    const baseDir = this.store.getBaseDir(connectionId, database);
    const manifest = await this.store.readManifest(baseDir);
    if (!manifest) {
      return null;
    }

    const tokensIndex = await this.store.readTokens(baseDir, manifest);
    const joinGraph = await this.store.readJoinGraph(baseDir, manifest);
    if (!tokensIndex || !joinGraph) {
      return null;
    }

    // 1. Perform lexical search
    const queryTokens = tokenize(question);
    const lexicalScores: Record<string, number> = {};

    const overrides = await this.store.readOverrides(baseDir);
    const excludedRefs = new Set<string>();
    if (overrides?.objects) {
      for (const [ref, obj] of Object.entries(overrides.objects)) {
        if (obj.excluded) {
          excludedRefs.add(ref);
        }
      }
    }

    // Get candidate refs from postings (direct and synonyms)
    const candidates = candidateRefsFromPostings(queryTokens, tokensIndex);

    for (const ref of candidates) {
      if (excludedRefs.has(ref)) {
        continue;
      }
      const score = scoreObject(ref, queryTokens, tokensIndex, manifest.counts);
      if (score > 0) {
        lexicalScores[ref] = score;
      }
    }

    // Read values.json if it exists and apply value token hits boost
    const valueIndex = await this.store.readValues(baseDir, manifest);
    if (valueIndex) {
      for (const token of queryTokens) {
        const valHits = valueIndex[token];
        if (valHits) {
          for (const hit of valHits) {
            if (excludedRefs.has(hit.ref)) {
              continue;
            }
            if (overrides?.objects?.[hit.ref]?.columns?.[hit.col]?.pii) {
              continue;
            }
            lexicalScores[hit.ref] = (lexicalScores[hit.ref] || 0) + 2.0;
          }
        }
      }
    }

    // Sort by lexical score descending
    const lexicalHits = Object.entries(lexicalScores)
      .map(([ref, score]) => ({ ref, score }))
      .sort((a, b) => b.score - a.score);

    let hits = lexicalHits.slice(0, 10);

    // 2. Premium: Semantic search if embeddings exist
    const isEmbedEnabled = config.get<boolean>('postgresExplorer.dbIndex.enableEmbeddings', false);
    if (isEmbedEnabled && manifest.derived.embeddings && manifest.derived.embeddingsMeta) {
      try {
        const embeddingsMetaUri = vscode.Uri.joinPath(baseDir, manifest.derived.embeddingsMeta);
        const embeddingsBinUri = vscode.Uri.joinPath(baseDir, manifest.derived.embeddings);

        const metaData = await vscode.workspace.fs.readFile(embeddingsMetaUri);
        const metaEntries = JSON.parse(Buffer.from(metaData).toString('utf-8')) as EmbeddingMetaEntry[];

        const binData = await vscode.workspace.fs.readFile(embeddingsBinUri);

        const firstMeta = metaEntries[0];
        let queryVec: number[] | null = null;

        if (this.lastQuery === question && this.lastEmbedVector) {
          queryVec = this.lastEmbedVector;
        } else {
          if (firstMeta?.model === 'Xenova/all-MiniLM-L6-v2') {
            const { generateLocalEmbedding } = require('./localEmbedder');
            queryVec = await generateLocalEmbedding(question, this.store.globalStorageUri);
          } else {
            const allowed = isProFeatureEnabled(ProFeature.DbIndexEmbed);
            if (allowed) {
              const { generateEmbedding } = require('./embeddings');
              const res = await generateEmbedding(question, config);
              queryVec = res.vector;
            }
          }
          if (queryVec) {
            this.lastQuery = question;
            this.lastEmbedVector = queryVec;
          }
        }

        if (!queryVec) {
          throw new Error('No query embedding generated');
        }

        const semanticHits: { ref: string; score: number }[] = [];
        for (let i = 0; i < metaEntries.length; i++) {
          const meta = metaEntries[i];
          if (meta) {
            if (excludedRefs.has(meta.ref)) {
              continue;
            }
            const docVec = deserializeEmbedding(binData, i, meta.dim);
            const sim = cosineSimilarity(queryVec, docVec);
            if (sim > 0) {
              semanticHits.push({ ref: meta.ref, score: sim });
            }
          }
        }

        // Merge using Reciprocal Rank Fusion (RRF)
        const lexicalRank = new Map(lexicalHits.map((h, idx) => [h.ref, idx]));
        const semanticRank = new Map(semanticHits.sort((a, b) => b.score - a.score).map((h, idx) => [h.ref, idx]));

        const rrfScores: { ref: string; score: number }[] = [];
        const mergedRefs = new Set([...lexicalRank.keys(), ...semanticRank.keys()]);

        for (const ref of mergedRefs) {
          const rL = lexicalRank.has(ref) ? lexicalRank.get(ref)! : 10000;
          const rS = semanticRank.has(ref) ? semanticRank.get(ref)! : 10000;
          const rrf = (1 / (60 + rL)) + (1 / (60 + rS));
          rrfScores.push({ ref, score: rrf });
        }

        hits = rrfScores.sort((a, b) => b.score - a.score).slice(0, 10);
      } catch {
        // Fall back to lexical hits on embedding failures
      }
    }

    const topK = hits.slice(0, 5);
    const topKRefs = topK.map(h => h.ref);

    // 3. Compute join paths and expand hits
    const finalHitsMap = new Map<string, { ref: string; score: number; detail: 'full' | 'columns' | 'skeleton' }>();
    for (const h of topK) {
      finalHitsMap.set(h.ref, { ref: h.ref, score: h.score, detail: 'full' });
    }

    const joinHints: string[] = [];

    // Pairwise BFS paths between top-k tables
    for (let i = 0; i < topKRefs.length; i++) {
      for (let j = i + 1; j < topKRefs.length; j++) {
        const tA = topKRefs[i];
        const tB = topKRefs[j];
        if (tA && tB) {
          const path = findShortestJoinPath(tA, tB, joinGraph);
          if (path && path.length > 0) {
            for (const edge of path) {
              // Add join hint details
              const colPairs = edge.cols.map(c => `${edge.from}.${c[0]} = ${edge.to}.${c[1]}`).join(' AND ');
              const hint = `${colPairs} (${edge.via})`;
              if (!joinHints.includes(hint)) {
                joinHints.push(hint);
              }

              // Add connecting intermediate tables to hits as skeleton
              if (!finalHitsMap.has(edge.from)) {
                finalHitsMap.set(edge.from, { ref: edge.from, score: 0.1, detail: 'skeleton' });
              }
              if (!finalHitsMap.has(edge.to)) {
                finalHitsMap.set(edge.to, { ref: edge.to, score: 0.1, detail: 'skeleton' });
              }
            }
          }
        }
      }
    }

    // 4. Token budget-aware detail degradation
    let hitsList = Array.from(finalHitsMap.values()).sort((a, b) => b.score - a.score);
    let estimatedTokens = this.estimateContextTokens(hitsList, manifest);

    // Degrade hits to columns then skeleton until it fits the budget
    while (estimatedTokens > budgetTokens && hitsList.some(h => h.detail !== 'skeleton')) {
      for (const hit of hitsList) {
        if (hit.detail === 'full') {
          hit.detail = 'columns';
          break;
        } else if (hit.detail === 'columns') {
          hit.detail = 'skeleton';
          break;
        }
      }
      estimatedTokens = this.estimateContextTokens(hitsList, manifest);
    }

    // If still over budget, slice hits off the tail
    while (estimatedTokens > budgetTokens && hitsList.length > 1) {
      hitsList.pop();
      estimatedTokens = this.estimateContextTokens(hitsList, manifest);
    }

    // 5. Check fingerprint drift (rely on AutoRefreshService callback cache)
    let fingerprintMatch = true;
    try {
      const { AutoRefreshService } = require('../../services/AutoRefreshService');
      const activeFp = AutoRefreshService.getFingerprint?.(connectionId, database);
      if (activeFp && activeFp !== manifest.schemaFingerprint) {
        fingerprintMatch = false;
      }
    } catch {
      // ignore
    }

    const packMarkdown = await buildContextPack(
      hitsList,
      this.store,
      baseDir,
      manifest,
      joinHints,
      !fingerprintMatch,
      question
    );

    return {
      packMarkdown,
      objects: hitsList,
      joinHints,
      tokensUsed: estimatedTokens,
      staleness: {
        indexedAt: manifest.indexedAt,
        fingerprintMatch,
      },
    };
  }

  /**
   * Search for objects by matching query token scores. Used by agent search_schema tools.
   */
  public async search(
    connectionId: string,
    database: string,
    query: string,
    limit: number = 10
  ): Promise<RankedHit[]> {
    const baseDir = this.store.getBaseDir(connectionId, database);
    const manifest = await this.store.readManifest(baseDir);
    if (!manifest) {
      return [];
    }

    const tokensIndex = await this.store.readTokens(baseDir, manifest);
    if (!tokensIndex) {
      return [];
    }

    const queryTokens = tokenize(query);
    const candidates = candidateRefsFromPostings(queryTokens, tokensIndex);
    const scoresMap: Record<string, number> = {};

    const overrides = await this.store.readOverrides(baseDir);
    const excludedRefs = new Set<string>();
    if (overrides?.objects) {
      for (const [ref, obj] of Object.entries(overrides.objects)) {
        if (obj.excluded) {
          excludedRefs.add(ref);
        }
      }
    }

    for (const ref of candidates) {
      if (excludedRefs.has(ref)) {
        continue;
      }
      const score = scoreObject(ref, queryTokens, tokensIndex, manifest.counts);
      if (score > 0) {
        scoresMap[ref] = score;
      }
    }

    const valueIndex = await this.store.readValues(baseDir, manifest);
    if (valueIndex) {
      for (const token of queryTokens) {
        const valHits = valueIndex[token];
        if (valHits) {
          for (const hit of valHits) {
            if (excludedRefs.has(hit.ref)) {
              continue;
            }
            if (overrides?.objects?.[hit.ref]?.columns?.[hit.col]?.pii) {
              continue;
            }
            scoresMap[hit.ref] = (scoresMap[hit.ref] || 0) + 2.0;
          }
        }
      }
    }

    const sortedCandidates = Object.entries(scoresMap)
      .map(([ref, score]) => ({ ref, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const hits: RankedHit[] = [];
    for (const item of sortedCandidates) {
      const parts = item.ref.split('.');
      const schema = parts[0] || 'public';
      const name = parts[1] || '';
      const entry = await this.store.getObjectEntry(baseDir, manifest, schema, name);
      hits.push({
        ref: item.ref,
        score: item.score,
        kind: entry ? entry.kind : 'table'
      });
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Fast-path describe object utilizing cached index shards.
   */
  public async describe(connectionId: string, database: string, ref: string): Promise<ObjectEntry | null> {
    const baseDir = this.store.getBaseDir(connectionId, database);
    const manifest = await this.store.readManifest(baseDir);
    if (!manifest) {
      return null;
    }

    const parts = ref.split('.');
    const schema = parts[0] || 'public';
    const name = parts[1] || '';

    const entry = await this.store.getObjectEntry(baseDir, manifest, schema, name);
    if (!entry || entry.excluded) {
      return null;
    }
    return entry;
  }

  private estimateContextTokens(
    hits: Array<{ ref: string; detail: 'full' | 'columns' | 'skeleton' }>,
    manifest: IndexManifest
  ): number {
    let tokens = 100; // base markdown structure wrapping overhead
    for (const hit of hits) {
      const shard = manifest.shards.find(s => s.schema === hit.ref.split('.')[0]);
      const approxObjectBytes = shard ? Math.round(shard.bytes / shard.objects) : 1000;

      if (hit.detail === 'full') {
        tokens += Math.round(approxObjectBytes / 4);
      } else if (hit.detail === 'columns') {
        tokens += Math.round(approxObjectBytes / 12);
      } else {
        tokens += 30; // skeleton table name + columns list token estimate
      }
    }
    return tokens;
  }
}
