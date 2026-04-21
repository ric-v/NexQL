import type { ExplainPlanParser, PlanMetrics } from '@nexql/core/core/db/ExplainPlanParser';

/**
 * MySQL EXPLAIN plan parser.
 * Parses the JSON output from EXPLAIN FORMAT=JSON into normalized PlanMetrics.
 */
export class MysqlExplainPlanParser implements ExplainPlanParser {
  parsePlan(rawPlan: unknown): PlanMetrics | null {
    try {
      const plan = this.extractPlan(rawPlan);
      if (!plan) {
        return null;
      }

      const queryBlock = plan.query_block;
      if (!queryBlock) {
        return null;
      }

      let sequentialScans = 0;
      let indexScans = 0;
      let estimatedRows = 0;
      const bottlenecks: string[] = [];
      const recommendations: string[] = [];

      // Walk the query block tree
      const walkNode = (node: any) => {
        if (!node || typeof node !== 'object') {
          return;
        }

        // Check table access
        if (node.table) {
          const table = node.table;
          const accessType = table.access_type;
          const rows = table.rows_examined_per_scan ?? table.rows_produced_per_join ?? 0;

          if (accessType === 'ALL') {
            sequentialScans++;
            if (rows > 10000) {
              const tableName = table.table_name ?? 'unknown';
              bottlenecks.push(`Full table scan on "${tableName}" (${rows} rows)`);
              recommendations.push(`Consider adding an index on "${tableName}"`);
            }
          } else if (accessType === 'index' || accessType === 'ref' || accessType === 'eq_ref' ||
                     accessType === 'range' || accessType === 'index_merge') {
            indexScans++;
          }

          estimatedRows += rows;
        }

        // Recurse into nested structures
        if (node.nested_loop && Array.isArray(node.nested_loop)) {
          for (const item of node.nested_loop) {
            walkNode(item);
          }
        }
        if (node.ordering_operation) {
          walkNode(node.ordering_operation);
        }
        if (node.grouping_operation) {
          walkNode(node.grouping_operation);
        }
        if (node.duplicates_removal) {
          walkNode(node.duplicates_removal);
        }
        if (node.query_block) {
          walkNode(node.query_block);
        }
        if (node.subqueries && Array.isArray(node.subqueries)) {
          for (const sub of node.subqueries) {
            walkNode(sub);
          }
        }
        if (node.attached_subqueries && Array.isArray(node.attached_subqueries)) {
          for (const sub of node.attached_subqueries) {
            walkNode(sub);
          }
        }
      };

      walkNode(queryBlock);

      const totalCost = queryBlock.cost_info?.query_cost
        ? parseFloat(queryBlock.cost_info.query_cost)
        : 0;

      return {
        totalCost,
        planningTime: 0, // MySQL EXPLAIN FORMAT=JSON does not provide planning time
        executionTime: 0, // MySQL EXPLAIN FORMAT=JSON does not provide execution time
        sequentialScans,
        indexScans,
        estimatedRows,
        bottlenecks,
        recommendations,
      };
    } catch {
      return null;
    }
  }

  private extractPlan(rawPlan: unknown): any | null {
    if (!rawPlan) {
      return null;
    }

    // MySQL EXPLAIN FORMAT=JSON returns { query_block: { ... } }
    if (typeof rawPlan === 'object' && rawPlan !== null && 'query_block' in rawPlan) {
      return rawPlan;
    }

    // Handle array result from query execution (e.g., [{ EXPLAIN: '...' }])
    if (Array.isArray(rawPlan)) {
      if (rawPlan.length > 0) {
        const first = rawPlan[0];
        if (first && typeof first === 'object') {
          if ('query_block' in first) {
            return first;
          }
          // MySQL may return { EXPLAIN: '<json string>' }
          if ('EXPLAIN' in first) {
            const nested = first['EXPLAIN'];
            if (typeof nested === 'string') {
              try {
                return JSON.parse(nested);
              } catch {
                return null;
              }
            }
            return nested;
          }
        }
      }
      return null;
    }

    // Try parsing as string
    if (typeof rawPlan === 'string') {
      try {
        return this.extractPlan(JSON.parse(rawPlan));
      } catch {
        return null;
      }
    }

    return null;
  }
}
