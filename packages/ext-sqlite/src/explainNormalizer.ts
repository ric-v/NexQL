import type { ExplainPlanNormalizer, ExplainNode, ExplainMeta } from '@nexql/core/core/db/ExplainPlanNormalizer';

/**
 * SQLite EXPLAIN QUERY PLAN normalizer.
 * Converts SQLite's EXPLAIN QUERY PLAN output (id, parent, notused, detail)
 * into a normalized ExplainNode tree suitable for visualization.
 */
export class SqliteExplainNormalizer implements ExplainPlanNormalizer {
  normalize(rawPlan: unknown): { root: ExplainNode | null; meta: ExplainMeta } {
    const defaultMeta: ExplainMeta = {
      planningTime: null,
      executionTime: null,
      nodeCount: 0,
    };

    try {
      const rows = this.extractRows(rawPlan);
      if (!rows || rows.length === 0) {
        return { root: null, meta: defaultMeta };
      }

      // Build a map of id -> node
      const nodeMap = new Map<number, ExplainNode & { _id: number; _parent: number }>();

      for (const row of rows) {
        const id = row.id ?? row.ID ?? 0;
        const parent = row.parent ?? row.Parent ?? 0;
        const detail = (row.detail ?? row.Detail ?? row.DETAIL ?? '').toString();

        const node = {
          _id: id,
          _parent: parent,
          nodeType: this.classifyDetail(detail),
          properties: { detail } as Record<string, unknown>,
          children: [] as ExplainNode[],
        };

        // Extract table name if present
        const tableMatch = detail.match(/(?:SCAN|SEARCH)\s+(\S+)/);
        if (tableMatch) {
          node.properties['tableName'] = tableMatch[1];
        }

        // Extract index name if present
        const indexMatch = detail.match(/USING\s+(?:COVERING\s+)?INDEX\s+(\S+)/);
        if (indexMatch) {
          node.properties['indexName'] = indexMatch[1];
        }

        // Extract row estimate if present
        const rowMatch = detail.match(/~(\d+)\s+rows/);
        if (rowMatch) {
          (node as any).estimatedRows = parseInt(rowMatch[1], 10);
        }

        nodeMap.set(id, node);
      }

      // Build tree by linking children to parents
      let root: ExplainNode | null = null;

      for (const [, node] of nodeMap) {
        const parentNode = nodeMap.get(node._parent);
        if (parentNode && parentNode !== node) {
          parentNode.children!.push(node);
        } else {
          // This is a root node (or its parent doesn't exist)
          if (!root) {
            root = node;
          } else {
            // Multiple roots — wrap in a synthetic root
            if (root.nodeType !== 'Query Plan') {
              const syntheticRoot: ExplainNode = {
                nodeType: 'Query Plan',
                children: [root],
                properties: {},
              };
              root = syntheticRoot;
            }
            root.children!.push(node);
          }
        }
      }

      // Clean up internal properties and empty children arrays
      const cleanNode = (n: ExplainNode): ExplainNode => {
        const cleaned: ExplainNode = {
          nodeType: n.nodeType,
          properties: n.properties,
        };
        if ((n as any).estimatedRows !== undefined) {
          cleaned.estimatedRows = (n as any).estimatedRows;
        }
        if (n.children && n.children.length > 0) {
          cleaned.children = n.children.map(cleanNode);
        }
        // Remove internal _id and _parent
        delete (cleaned as any)._id;
        delete (cleaned as any)._parent;
        return cleaned;
      };

      const cleanedRoot = root ? cleanNode(root) : null;

      const meta: ExplainMeta = {
        planningTime: null, // SQLite does not provide planning time
        executionTime: null, // SQLite does not provide execution time
        nodeCount: nodeMap.size,
      };

      return { root: cleanedRoot, meta };
    } catch {
      return { root: null, meta: defaultMeta };
    }
  }

  private classifyDetail(detail: string): string {
    if (detail.includes('SCAN')) {
      if (detail.includes('USING COVERING INDEX')) {
        return 'Covering Index Scan';
      }
      if (detail.includes('USING INDEX')) {
        return 'Index Scan';
      }
      return 'Table Scan';
    }
    if (detail.includes('SEARCH')) {
      if (detail.includes('USING COVERING INDEX')) {
        return 'Covering Index Search';
      }
      if (detail.includes('USING INDEX')) {
        return 'Index Search';
      }
      if (detail.includes('USING INTEGER PRIMARY KEY')) {
        return 'Primary Key Lookup';
      }
      return 'Search';
    }
    if (detail.includes('USE TEMP B-TREE')) {
      if (detail.includes('ORDER BY')) {
        return 'Sort (Temp B-Tree)';
      }
      if (detail.includes('GROUP BY')) {
        return 'Group (Temp B-Tree)';
      }
      if (detail.includes('DISTINCT')) {
        return 'Distinct (Temp B-Tree)';
      }
      return 'Temp B-Tree';
    }
    if (detail.includes('COMPOUND SUBQUERIES')) {
      return 'Compound Subqueries';
    }
    if (detail.includes('SCALAR SUBQUERY')) {
      return 'Scalar Subquery';
    }
    if (detail.includes('CORRELATED SCALAR SUBQUERY')) {
      return 'Correlated Scalar Subquery';
    }
    if (detail.includes('CO-ROUTINE')) {
      return 'Co-routine';
    }
    if (detail.includes('MATERIALIZE')) {
      return 'Materialize';
    }
    return detail || 'Unknown';
  }

  private extractRows(rawPlan: unknown): any[] | null {
    if (!rawPlan) {
      return null;
    }

    if (Array.isArray(rawPlan)) {
      if (rawPlan.length > 0 && typeof rawPlan[0] === 'object') {
        return rawPlan;
      }
      return null;
    }

    if (typeof rawPlan === 'object' && rawPlan !== null) {
      if ('rows' in rawPlan && Array.isArray((rawPlan as any).rows)) {
        return (rawPlan as any).rows;
      }
    }

    if (typeof rawPlan === 'string') {
      try {
        return this.extractRows(JSON.parse(rawPlan));
      } catch {
        return this.parseTextOutput(rawPlan);
      }
    }

    return null;
  }

  private parseTextOutput(text: string): any[] | null {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return null;
    }

    const rows: any[] = [];
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 4) {
        rows.push({
          id: parseInt(parts[0].trim(), 10),
          parent: parseInt(parts[1].trim(), 10),
          notused: parseInt(parts[2].trim(), 10),
          detail: parts.slice(3).join('|').trim(),
        });
      } else {
        rows.push({ id: rows.length, parent: 0, notused: 0, detail: line.trim() });
      }
    }

    return rows.length > 0 ? rows : null;
  }
}
