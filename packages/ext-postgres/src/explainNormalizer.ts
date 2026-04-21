import type { ExplainPlanNormalizer, ExplainNode, ExplainMeta } from '@nexql/core/core/db/ExplainPlanNormalizer';

/**
 * PostgreSQL EXPLAIN plan normalizer.
 * Converts PG's JSON EXPLAIN output into a normalized ExplainNode tree
 * suitable for visualization.
 */
export class PostgresExplainNormalizer implements ExplainPlanNormalizer {
  normalize(rawPlan: unknown): { root: ExplainNode | null; meta: ExplainMeta } {
    const defaultMeta: ExplainMeta = {
      planningTime: null,
      executionTime: null,
      nodeCount: 0,
    };

    try {
      const plan = this.extractPlan(rawPlan);
      if (!plan || !plan.Plan) {
        return { root: null, meta: defaultMeta };
      }

      let nodeCount = 0;
      const buildNode = (pgNode: any): ExplainNode => {
        nodeCount++;
        const node: ExplainNode = {
          nodeType: pgNode['Node Type'] ?? 'Unknown',
          cost: pgNode['Total Cost'],
          estimatedRows: pgNode['Plan Rows'],
          actualRows: pgNode['Actual Rows'],
          actualTime: pgNode['Actual Total Time'],
          loops: pgNode['Actual Loops'],
          properties: {},
        };

        // Collect additional properties
        if (pgNode['Relation Name']) {
          node.properties!['relationName'] = pgNode['Relation Name'];
        }
        if (pgNode['Schema']) {
          node.properties!['schema'] = pgNode['Schema'];
        }
        if (pgNode['Alias']) {
          node.properties!['alias'] = pgNode['Alias'];
        }
        if (pgNode['Index Name']) {
          node.properties!['indexName'] = pgNode['Index Name'];
        }
        if (pgNode['Join Type']) {
          node.properties!['joinType'] = pgNode['Join Type'];
        }
        if (pgNode['Filter']) {
          node.properties!['filter'] = pgNode['Filter'];
        }
        if (pgNode['Index Cond']) {
          node.properties!['indexCondition'] = pgNode['Index Cond'];
        }
        if (pgNode['Hash Cond']) {
          node.properties!['hashCondition'] = pgNode['Hash Cond'];
        }
        if (pgNode['Sort Key']) {
          node.properties!['sortKey'] = pgNode['Sort Key'];
        }
        if (pgNode['Shared Hit Blocks'] !== undefined) {
          node.properties!['sharedHitBlocks'] = pgNode['Shared Hit Blocks'];
        }
        if (pgNode['Shared Read Blocks'] !== undefined) {
          node.properties!['sharedReadBlocks'] = pgNode['Shared Read Blocks'];
        }

        // Recurse into children
        if (pgNode.Plans && Array.isArray(pgNode.Plans)) {
          node.children = pgNode.Plans.map((child: any) => buildNode(child));
        }

        return node;
      };

      const root = buildNode(plan.Plan);

      const meta: ExplainMeta = {
        planningTime: plan['Planning Time'] ?? null,
        executionTime: plan['Execution Time'] ?? null,
        nodeCount,
      };

      return { root, meta };
    } catch {
      return { root: null, meta: defaultMeta };
    }
  }

  private extractPlan(rawPlan: unknown): any | null {
    if (!rawPlan) {
      return null;
    }

    if (Array.isArray(rawPlan)) {
      if (rawPlan.length > 0) {
        const first = rawPlan[0];
        if (first && typeof first === 'object') {
          if ('Plan' in first) {
            return first;
          }
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
