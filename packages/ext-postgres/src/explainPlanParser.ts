import type { ExplainPlanParser, PlanMetrics } from '@nexql/core/core/db/ExplainPlanParser';

/**
 * PostgreSQL EXPLAIN plan parser.
 * Parses the JSON output from EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
 * into normalized PlanMetrics.
 */
export class PostgresExplainPlanParser implements ExplainPlanParser {
  parsePlan(rawPlan: unknown): PlanMetrics | null {
    try {
      const plan = this.extractPlan(rawPlan);
      if (!plan) {
        return null;
      }

      const rootNode = plan.Plan;
      if (!rootNode) {
        return null;
      }

      let sequentialScans = 0;
      let indexScans = 0;
      let estimatedRows = 0;
      let actualRows = 0;
      const bottlenecks: string[] = [];
      const recommendations: string[] = [];

      // Walk the plan tree
      const walkNode = (node: any) => {
        const nodeType: string = node['Node Type'] ?? '';

        if (nodeType === 'Seq Scan') {
          sequentialScans++;
          const rows = node['Plan Rows'] ?? 0;
          if (rows > 10000) {
            bottlenecks.push(`Sequential scan on "${node['Relation Name'] ?? 'unknown'}" (${rows} rows)`);
            recommendations.push(`Consider adding an index on "${node['Relation Name'] ?? 'unknown'}"`);
          }
        } else if (nodeType.includes('Index')) {
          indexScans++;
        }

        estimatedRows += node['Plan Rows'] ?? 0;
        actualRows += node['Actual Rows'] ?? 0;

        // Recurse into child plans
        if (node.Plans && Array.isArray(node.Plans)) {
          for (const child of node.Plans) {
            walkNode(child);
          }
        }
      };

      walkNode(rootNode);

      const totalCost = rootNode['Total Cost'] ?? 0;
      const planningTime = plan['Planning Time'] ?? 0;
      const executionTime = plan['Execution Time'] ?? 0;

      // Buffer stats
      let bufferStats: PlanMetrics['bufferStats'];
      if (rootNode['Shared Hit Blocks'] !== undefined || rootNode['Shared Read Blocks'] !== undefined) {
        const hits = rootNode['Shared Hit Blocks'] ?? 0;
        const reads = rootNode['Shared Read Blocks'] ?? 0;
        const total = hits + reads;
        bufferStats = {
          bufferHits: hits,
          bufferReads: reads,
          hitRatio: total > 0 ? hits / total : 0,
        };
        if (bufferStats.hitRatio < 0.9 && total > 100) {
          bottlenecks.push(`Low buffer hit ratio: ${(bufferStats.hitRatio * 100).toFixed(1)}%`);
          recommendations.push('Consider increasing shared_buffers or optimizing query to reduce I/O');
        }
      }

      return {
        totalCost,
        planningTime,
        executionTime,
        sequentialScans,
        indexScans,
        estimatedRows,
        actualRows: actualRows > 0 ? actualRows : undefined,
        bottlenecks,
        recommendations,
        bufferStats,
      };
    } catch {
      return null;
    }
  }

  private extractPlan(rawPlan: unknown): any | null {
    if (!rawPlan) {
      return null;
    }

    // PG EXPLAIN JSON format returns an array with one element
    if (Array.isArray(rawPlan)) {
      if (rawPlan.length > 0) {
        const first = rawPlan[0];
        // Could be [{Plan: ...}] or [{rows: [{...}]}] depending on how it was fetched
        if (first && typeof first === 'object') {
          if ('Plan' in first) {
            return first;
          }
          // Handle case where result comes from query rows
          if ('QUERY PLAN' in first) {
            const nested = first['QUERY PLAN'];
            return Array.isArray(nested) ? nested[0] : nested;
          }
        }
      }
      return null;
    }

    if (typeof rawPlan === 'object' && rawPlan !== null && 'Plan' in rawPlan) {
      return rawPlan;
    }

    // Try parsing as string
    if (typeof rawPlan === 'string') {
      try {
        const parsed = JSON.parse(rawPlan);
        return this.extractPlan(parsed);
      } catch {
        return null;
      }
    }

    return null;
  }
}
