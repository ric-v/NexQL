/**
 * Normalized metrics extracted from an engine-specific EXPLAIN plan.
 */
export interface PlanMetrics {
  /** Total estimated cost of the query plan */
  totalCost: number;
  /** Time spent planning the query (ms) */
  planningTime: number;
  /** Time spent executing the query (ms) */
  executionTime: number;
  /** Number of sequential scan operations */
  sequentialScans: number;
  /** Number of index scan operations */
  indexScans: number;
  /** Estimated total rows processed */
  estimatedRows: number;
  /** Actual total rows processed (if ANALYZE was used) */
  actualRows?: number;
  /** Identified performance bottlenecks */
  bottlenecks: string[];
  /** Optimization recommendations */
  recommendations: string[];
  /** Buffer/IO statistics if available */
  bufferStats?: {
    bufferHits: number;
    bufferReads: number;
    hitRatio: number;
  };
}

/**
 * Interface for engine-specific EXPLAIN plan parsing.
 * Accepts raw EXPLAIN output (format varies by engine) and returns
 * normalized metrics.
 */
export interface ExplainPlanParser {
  /**
   * Parses a raw EXPLAIN plan into normalized metrics.
   * @param rawPlan - The raw EXPLAIN output (JSON for PG, XML for MSSQL, TREE for MySQL, etc.)
   * @returns Normalized plan metrics, or null if parsing fails
   */
  parsePlan(rawPlan: unknown): PlanMetrics | null;
}
