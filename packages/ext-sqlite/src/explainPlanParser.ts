import type { ExplainPlanParser, PlanMetrics } from '@nexql/core/core/db/ExplainPlanParser';

/**
 * SQLite EXPLAIN QUERY PLAN parser.
 * Parses the output from EXPLAIN QUERY PLAN which returns rows with
 * (id, parent, notused, detail) columns.
 */
export class SqliteExplainPlanParser implements ExplainPlanParser {
  parsePlan(rawPlan: unknown): PlanMetrics | null {
    try {
      const rows = this.extractRows(rawPlan);
      if (!rows || rows.length === 0) {
        return null;
      }

      let sequentialScans = 0;
      let indexScans = 0;
      let estimatedRows = 0;
      const bottlenecks: string[] = [];
      const recommendations: string[] = [];

      for (const row of rows) {
        const detail = (row.detail ?? row.Detail ?? row.DETAIL ?? '').toString();

        if (detail.includes('SCAN')) {
          sequentialScans++;
          // Extract table name from "SCAN <table>"
          const match = detail.match(/SCAN\s+(\S+)/);
          if (match) {
            bottlenecks.push(`Full table scan on "${match[1]}"`);
            recommendations.push(`Consider adding an index on "${match[1]}"`);
          }
        } else if (detail.includes('SEARCH') || detail.includes('USING INDEX') ||
                   detail.includes('USING COVERING INDEX')) {
          indexScans++;
        }

        // SQLite EXPLAIN QUERY PLAN does not provide row estimates
        // in the standard output, but some versions include (~N rows)
        const rowMatch = detail.match(/~(\d+)\s+rows/);
        if (rowMatch) {
          estimatedRows += parseInt(rowMatch[1], 10);
        }
      }

      return {
        totalCost: 0, // SQLite does not provide cost estimates
        planningTime: 0, // SQLite does not provide planning time
        executionTime: 0, // SQLite does not provide execution time
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

  private extractRows(rawPlan: unknown): any[] | null {
    if (!rawPlan) {
      return null;
    }

    // Standard case: array of row objects with id, parent, notused, detail
    if (Array.isArray(rawPlan)) {
      if (rawPlan.length > 0 && typeof rawPlan[0] === 'object') {
        return rawPlan;
      }
      return null;
    }

    // Handle object with rows property
    if (typeof rawPlan === 'object' && rawPlan !== null) {
      if ('rows' in rawPlan && Array.isArray((rawPlan as any).rows)) {
        return (rawPlan as any).rows;
      }
    }

    // Try parsing as string
    if (typeof rawPlan === 'string') {
      try {
        return this.extractRows(JSON.parse(rawPlan));
      } catch {
        // Try parsing line-by-line text output
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
      // Format: "id|parent|notused|detail" or tabular format
      const parts = line.split('|');
      if (parts.length >= 4) {
        rows.push({
          id: parseInt(parts[0].trim(), 10),
          parent: parseInt(parts[1].trim(), 10),
          notused: parseInt(parts[2].trim(), 10),
          detail: parts.slice(3).join('|').trim(),
        });
      } else {
        // Treat the whole line as detail
        rows.push({ id: 0, parent: 0, notused: 0, detail: line.trim() });
      }
    }

    return rows.length > 0 ? rows : null;
  }
}
