import type { ExplainPlanNormalizer, ExplainNode, ExplainMeta } from '@nexql/core/core/db/ExplainPlanNormalizer';

/**
 * MySQL EXPLAIN plan normalizer.
 * Converts MySQL's EXPLAIN FORMAT=JSON output into a normalized ExplainNode tree
 * suitable for visualization.
 */
export class MysqlExplainNormalizer implements ExplainPlanNormalizer {
  normalize(rawPlan: unknown): { root: ExplainNode | null; meta: ExplainMeta } {
    const defaultMeta: ExplainMeta = {
      planningTime: null,
      executionTime: null,
      nodeCount: 0,
    };

    try {
      const plan = this.extractPlan(rawPlan);
      if (!plan || !plan.query_block) {
        return { root: null, meta: defaultMeta };
      }

      let nodeCount = 0;
      const root = this.buildNodeFromQueryBlock(plan.query_block, () => { nodeCount++; });

      const meta: ExplainMeta = {
        planningTime: null, // MySQL EXPLAIN JSON does not provide planning time
        executionTime: null, // MySQL EXPLAIN JSON does not provide execution time
        nodeCount,
      };

      return { root, meta };
    } catch {
      return { root: null, meta: defaultMeta };
    }
  }

  private buildNodeFromQueryBlock(queryBlock: any, incrementCount: () => void): ExplainNode {
    incrementCount();

    const cost = queryBlock.cost_info?.query_cost
      ? parseFloat(queryBlock.cost_info.query_cost)
      : undefined;

    const node: ExplainNode = {
      nodeType: 'Query Block',
      cost,
      properties: {},
      children: [],
    };

    if (queryBlock.select_id) {
      node.properties!['selectId'] = queryBlock.select_id;
    }
    if (queryBlock.message) {
      node.properties!['message'] = queryBlock.message;
    }

    // Process nested loop
    if (queryBlock.nested_loop && Array.isArray(queryBlock.nested_loop)) {
      for (const item of queryBlock.nested_loop) {
        if (item.table) {
          node.children!.push(this.buildTableNode(item.table, incrementCount));
        }
      }
    }

    // Process ordering operation
    if (queryBlock.ordering_operation) {
      node.children!.push(this.buildOrderingNode(queryBlock.ordering_operation, incrementCount));
    }

    // Process grouping operation
    if (queryBlock.grouping_operation) {
      node.children!.push(this.buildGroupingNode(queryBlock.grouping_operation, incrementCount));
    }

    // Process duplicates removal
    if (queryBlock.duplicates_removal) {
      node.children!.push(this.buildDuplicatesNode(queryBlock.duplicates_removal, incrementCount));
    }

    // Process single table (no nested_loop)
    if (queryBlock.table && !queryBlock.nested_loop) {
      node.children!.push(this.buildTableNode(queryBlock.table, incrementCount));
    }

    // Process subqueries
    if (queryBlock.optimized_away_subqueries && Array.isArray(queryBlock.optimized_away_subqueries)) {
      for (const sub of queryBlock.optimized_away_subqueries) {
        if (sub.query_block) {
          node.children!.push(this.buildNodeFromQueryBlock(sub.query_block, incrementCount));
        }
      }
    }

    if (node.children!.length === 0) {
      delete node.children;
    }

    return node;
  }

  private buildTableNode(table: any, incrementCount: () => void): ExplainNode {
    incrementCount();

    const accessType = table.access_type ?? 'Unknown';
    const nodeType = this.mapAccessType(accessType);

    const cost = table.cost_info?.read_cost
      ? parseFloat(table.cost_info.read_cost)
      : undefined;

    const node: ExplainNode = {
      nodeType,
      cost,
      estimatedRows: table.rows_examined_per_scan ?? table.rows_produced_per_join,
      properties: {},
    };

    if (table.table_name) {
      node.properties!['tableName'] = table.table_name;
    }
    if (table.access_type) {
      node.properties!['accessType'] = table.access_type;
    }
    if (table.key) {
      node.properties!['key'] = table.key;
    }
    if (table.key_length) {
      node.properties!['keyLength'] = table.key_length;
    }
    if (table.ref && Array.isArray(table.ref)) {
      node.properties!['ref'] = table.ref.join(', ');
    }
    if (table.used_key_parts && Array.isArray(table.used_key_parts)) {
      node.properties!['usedKeyParts'] = table.used_key_parts.join(', ');
    }
    if (table.attached_condition) {
      node.properties!['filter'] = table.attached_condition;
    }

    // Process materialized subqueries
    if (table.materialized_from_subquery) {
      const sub = table.materialized_from_subquery;
      if (sub.query_block) {
        node.children = [this.buildNodeFromQueryBlock(sub.query_block, incrementCount)];
      }
    }

    return node;
  }

  private buildOrderingNode(ordering: any, incrementCount: () => void): ExplainNode {
    incrementCount();

    const node: ExplainNode = {
      nodeType: 'Sort',
      properties: {},
      children: [],
    };

    if (ordering.using_filesort !== undefined) {
      node.properties!['usingFilesort'] = ordering.using_filesort;
    }
    if (ordering.using_temporary_table !== undefined) {
      node.properties!['usingTemporaryTable'] = ordering.using_temporary_table;
    }

    // Process nested content
    if (ordering.nested_loop && Array.isArray(ordering.nested_loop)) {
      for (const item of ordering.nested_loop) {
        if (item.table) {
          node.children!.push(this.buildTableNode(item.table, incrementCount));
        }
      }
    }
    if (ordering.table) {
      node.children!.push(this.buildTableNode(ordering.table, incrementCount));
    }
    if (ordering.query_block) {
      node.children!.push(this.buildNodeFromQueryBlock(ordering.query_block, incrementCount));
    }

    if (node.children!.length === 0) {
      delete node.children;
    }

    return node;
  }

  private buildGroupingNode(grouping: any, incrementCount: () => void): ExplainNode {
    incrementCount();

    const node: ExplainNode = {
      nodeType: 'Group',
      properties: {},
      children: [],
    };

    if (grouping.using_temporary_table !== undefined) {
      node.properties!['usingTemporaryTable'] = grouping.using_temporary_table;
    }
    if (grouping.using_filesort !== undefined) {
      node.properties!['usingFilesort'] = grouping.using_filesort;
    }

    if (grouping.nested_loop && Array.isArray(grouping.nested_loop)) {
      for (const item of grouping.nested_loop) {
        if (item.table) {
          node.children!.push(this.buildTableNode(item.table, incrementCount));
        }
      }
    }
    if (grouping.table) {
      node.children!.push(this.buildTableNode(grouping.table, incrementCount));
    }

    if (node.children!.length === 0) {
      delete node.children;
    }

    return node;
  }

  private buildDuplicatesNode(duplicates: any, incrementCount: () => void): ExplainNode {
    incrementCount();

    const node: ExplainNode = {
      nodeType: 'Duplicates Removal',
      properties: {},
      children: [],
    };

    if (duplicates.using_temporary_table !== undefined) {
      node.properties!['usingTemporaryTable'] = duplicates.using_temporary_table;
    }

    if (duplicates.nested_loop && Array.isArray(duplicates.nested_loop)) {
      for (const item of duplicates.nested_loop) {
        if (item.table) {
          node.children!.push(this.buildTableNode(item.table, incrementCount));
        }
      }
    }

    if (node.children!.length === 0) {
      delete node.children;
    }

    return node;
  }

  private mapAccessType(accessType: string): string {
    switch (accessType) {
      case 'ALL': return 'Full Table Scan';
      case 'index': return 'Full Index Scan';
      case 'range': return 'Index Range Scan';
      case 'ref': return 'Index Lookup';
      case 'eq_ref': return 'Unique Index Lookup';
      case 'const': return 'Constant';
      case 'system': return 'System';
      case 'index_merge': return 'Index Merge';
      case 'fulltext': return 'Fulltext Index';
      case 'ref_or_null': return 'Index Lookup (with NULL)';
      case 'unique_subquery': return 'Unique Subquery';
      case 'index_subquery': return 'Index Subquery';
      default: return accessType;
    }
  }

  private extractPlan(rawPlan: unknown): any | null {
    if (!rawPlan) {
      return null;
    }

    if (typeof rawPlan === 'object' && rawPlan !== null && 'query_block' in rawPlan) {
      return rawPlan;
    }

    if (Array.isArray(rawPlan)) {
      if (rawPlan.length > 0) {
        const first = rawPlan[0];
        if (first && typeof first === 'object') {
          if ('query_block' in first) {
            return first;
          }
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
