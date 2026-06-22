import { TokenIndex } from './types';

/**
 * Tokenizes a string by splitting camelCase boundaries, snake_case, underscores,
 * splitting on digit boundaries, expanding common database abbreviations,
 * converting to lowercase, and performing a basic English stemmer reduction.
 */
export function tokenize(text: string): string[] {
  if (!text) {
    return [];
  }
  // Split camelCase boundaries
  const camelSplit = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Split digit boundaries
  const digitSplit = camelSplit
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2');
  // Replace non-alphanumeric with spaces
  const normalized = digitSplit.replace(/[^a-zA-Z0-9]/g, ' ');
  const words = normalized.toLowerCase().split(/\s+/).filter(w => w.length > 1 || /^[0-9]$/.test(w));

  const expanded: string[] = [];
  for (const word of words) {
    const expansion = ABBREVIATIONS[word];
    if (expansion) {
      expanded.push(...expansion);
    } else {
      expanded.push(word);
    }
  }

  return expanded.map(stemWord);
}

/**
 * A basic suffix stemmer for English database identifiers (s/es/ies).
 */
function stemWord(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('es') && !word.endsWith('sses') && !word.endsWith('shes') && !word.endsWith('ches')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('as')) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Common abbreviations mapped to their expanded words.
 */
export const ABBREVIATIONS: Record<string, string[]> = {
  qty: ['quantity'],
  amt: ['amount'],
  dt: ['date'],
  addr: ['address'],
  org: ['organization'],
  usr: ['user'],
  desc: ['description'],
  num: ['number'],
  fk: ['foreign', 'key'],
  pk: ['primary', 'key']
};

/**
 * Synonym mapping mined from typical database patterns and direct hints.
 */
export const SYNONYMS: Record<string, string[]> = {
  customer: ['user', 'client', 'buyer', 'member'],
  user: ['customer', 'client', 'member', 'account'],
  order: ['purchase', 'transaction', 'sale', 'deal'],
  purchase: ['order', 'transaction', 'sale'],
  revenue: ['amount', 'price', 'sales', 'payment', 'income'],
  payment: ['revenue', 'charge', 'invoice'],
  product: ['item', 'goods', 'sku'],
  item: ['product', 'goods'],
  auth: ['login', 'credential', 'user'],
  config: ['setting', 'preference', 'option'],
};

/**
 * Find candidate object references by checking postings for direct query tokens and synonyms.
 */
export function candidateRefsFromPostings(
  queryTokens: string[],
  tokenIndex: TokenIndex
): string[] {
  const candidates = new Set<string>();
  for (const token of queryTokens) {
    // 1. Direct match candidates
    const postings = tokenIndex.postings[token];
    if (postings) {
      for (const [ref] of postings) {
        candidates.add(ref);
      }
    }

    // 2. Synonym match candidates
    const builtin = SYNONYMS[token] || [];
    const mined = tokenIndex.synonyms?.[token] || [];
    const syns = Array.from(new Set([...builtin, ...mined]));
    for (const syn of syns) {
      const synPostings = tokenIndex.postings[syn];
      if (synPostings) {
        for (const [ref] of synPostings) {
          candidates.add(ref);
        }
      }
    }
  }
  return Array.from(candidates);
}

/**
 * Compute the score of an object reference against query tokens using the TF-IDF postings list.
 */
export function scoreObject(
  objectRef: string,
  queryTokens: string[],
  tokenIndex: TokenIndex,
  counts: { tables: number }
): number {
  let score = 0;
  const N = counts.tables || 100;

  for (const token of queryTokens) {
    // 1. Lexical match in posting list
    const postings = tokenIndex.postings[token];
    if (postings) {
      const match = postings.find(p => p[0] === objectRef);
      if (match) {
        const weight = match[1];
        const df = tokenIndex.df[token] || 1;
        const idf = Math.log(1 + N / df);
        score += weight * idf;
      }
    }

    // 2. Synonym match (built-in + mined)
    const builtin = SYNONYMS[token] || [];
    const mined = tokenIndex.synonyms?.[token] || [];
    const syns = Array.from(new Set([...builtin, ...mined]));
    if (syns) {
      for (const syn of syns) {
        const synPostings = tokenIndex.postings[syn];
        if (synPostings) {
          const match = synPostings.find(p => p[0] === objectRef);
          if (match) {
            const weight = match[1] * 0.7; // Synonym penalty multiplier
            const df = tokenIndex.df[syn] || 1;
            const idf = Math.log(1 + N / df);
            score += weight * idf;
          }
        }
      }
    }
  }

  // penalize system or backup tables
  if (objectRef.includes('audit') || objectRef.includes('_bak') || objectRef.includes('_tmp') || objectRef.includes('backup')) {
    score -= 1.0;
  }

  return Math.max(0, score);
}

/**
 * Parses database object comments to mine synonyms (matching "aka" patterns or short parentheticals).
 */
export function extractSynonymsFromComment(comment: string): string[] {
  const results: string[] = [];
  // 1. aka / also known as patterns
  const akaRegex = /(?:aka|also known as)\s+([a-zA-Z0-9_-]+)/gi;
  let match;
  while ((match = akaRegex.exec(comment)) !== null) {
    if (match[1]) {
      results.push(match[1]);
    }
  }

  // 2. Short parentheticals
  const parenRegex = /\(([^)]+)\)/g;
  while ((match = parenRegex.exec(comment)) !== null) {
    const content = match[1].trim();
    if (content.length > 0 && content.length <= 25) {
      const cleaned = content.replace(/^(?:aka|also known as)\s+/i, '').trim();
      if (/^[a-zA-Z0-9_\-\s]+$/.test(cleaned)) {
        const words = cleaned.split(/\s+/);
        if (words.length <= 2) {
          results.push(cleaned);
        }
      }
    }
  }
  return Array.from(new Set(results));
}
