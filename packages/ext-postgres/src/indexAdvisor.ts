import type { IndexAdvisor, IndexRecommendation, IndexSuggestion } from '@nexql/core/core/db/IndexAdvisor';
import type { DbClient } from '@nexql/core/core/db/DbDriver';

/**
 * PostgreSQL index advisor.
 * Analyzes index usage statistics and query plans to provide
 * index recommendations and suggestions.
 */
export class PostgresIndexAdvisor implements IndexAdvisor {
  async analyzeIndexUsage(schema: string, table: string, client: DbClient): Promise<IndexRecommendation[]> {
    const result = await client.query(`
      SELECT
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        s.idx_scan AS scan_count,
        s.idx_tup_read AS tuples_read,
        s.idx_tup_fetch AS tuples_fetched,
        pg_relation_size(i.oid) AS index_size,
        pg_size_pretty(pg_relation_size(i.oid)) AS index_size_pretty
      FROM pg_catalog.pg_index ix
      JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid
      JOIN pg_catalog.pg_class t ON t.oid = ix.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      LEFT JOIN pg_catalog.pg_stat_user_indexes s
        ON s.indexrelid = ix.indexrelid
      WHERE n.nspname = $1 AND t.relname = $2
      ORDER BY s.idx_scan ASC NULLS FIRST
    `, [schema, table]);

    const recommendations: IndexRecommendation[] = [];

    for (const row of result.rows) {
      const scanCount = Number(row.scan_count ?? 0);
      const isPrimary = row.is_primary;
      const isUnique = row.is_unique;
      const indexSize = Number(row.index_size ?? 0);

      if (isPrimary) {
        // Never recommend dropping primary key indexes
        recommendations.push({
          indexName: row.index_name,
          tableName: table,
          recommendation: 'keep',
          reason: 'Primary key index — always required',
        });
      } else if (scanCount === 0 && !isUnique) {
        // Unused non-unique index
        recommendations.push({
          indexName: row.index_name,
          tableName: table,
          recommendation: 'drop',
          reason: `Index has never been scanned (0 scans) and uses ${row.index_size_pretty}`,
        });
      } else if (scanCount < 10 && !isUnique && indexSize > 1024 * 1024) {
        // Rarely used large index
        recommendations.push({
          indexName: row.index_name,
          tableName: table,
          recommendation: 'drop',
          reason: `Index is rarely used (${scanCount} scans) and uses ${row.index_size_pretty}`,
        });
      } else {
        recommendations.push({
          indexName: row.index_name,
          tableName: table,
          recommendation: 'keep',
          reason: `Index is actively used (${scanCount} scans)`,
        });
      }
    }

    return recommendations;
  }

  async suggestIndexes(query: string, client: DbClient): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    try {
      // Run EXPLAIN on the query to identify sequential scans
      const explainResult = await client.query(
        `EXPLAIN (FORMAT JSON) ${query}`
      );

      if (explainResult.rows.length === 0) {
        return suggestions;
      }

      const plan = explainResult.rows[0]['QUERY PLAN'] ?? explainResult.rows[0];
      const planData = Array.isArray(plan) ? plan[0] : plan;

      if (!planData || !planData.Plan) {
        return suggestions;
      }

      // Walk the plan tree looking for sequential scans
      const seqScans: Array<{ table: string; filter?: string; schema?: string }> = [];
      const walkNode = (node: any) => {
        if (node['Node Type'] === 'Seq Scan' && node['Relation Name']) {
          seqScans.push({
            table: node['Relation Name'],
            filter: node['Filter'],
            schema: node['Schema'] ?? 'public',
          });
        }
        if (node.Plans && Array.isArray(node.Plans)) {
          for (const child of node.Plans) {
            walkNode(child);
          }
        }
      };

      walkNode(planData.Plan);

      // Generate index suggestions for sequential scans with filters
      for (const scan of seqScans) {
        if (scan.filter) {
          // Extract column names from the filter (basic heuristic)
          const columnMatches = scan.filter.match(/\((\w+)\s/g);
          if (columnMatches && columnMatches.length > 0) {
            const columns = columnMatches
              .map(m => m.replace(/[()]/g, '').trim())
              .filter(c => c.length > 0);

            if (columns.length > 0) {
              const colList = columns.join(', ');
              suggestions.push({
                createStatement: `CREATE INDEX ON "${scan.schema}"."${scan.table}" (${colList});`,
                estimatedImprovement: 'Replaces sequential scan with index scan',
                reason: `Sequential scan detected on "${scan.table}" with filter: ${scan.filter}`,
              });
            }
          }
        }
      }
    } catch {
      // If EXPLAIN fails (e.g., syntax error in query), return empty suggestions
    }

    return suggestions;
  }
}
