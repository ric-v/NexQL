/**
 * A normalized node in an EXPLAIN plan tree, suitable for visualization.
 */
export interface ExplainNode {
    /** The operation type (e.g., 'Seq Scan', 'Index Scan', 'Hash Join') */
    nodeType: string;
    /** Estimated cost for this node */
    cost?: number;
    /** Estimated number of rows */
    estimatedRows?: number;
    /** Actual number of rows (if ANALYZE was used) */
    actualRows?: number;
    /** Actual time in ms (if ANALYZE was used) */
    actualTime?: number;
    /** Number of loops */
    loops?: number;
    /** Additional engine-specific properties */
    properties?: Record<string, unknown>;
    /** Child nodes in the plan tree */
    children?: ExplainNode[];
}
/**
 * Metadata about the overall EXPLAIN plan.
 */
export interface ExplainMeta {
    /** Time spent planning the query (ms), or null if unavailable */
    planningTime: number | null;
    /** Time spent executing the query (ms), or null if unavailable */
    executionTime: number | null;
    /** Total number of nodes in the plan tree */
    nodeCount?: number;
}
/**
 * Interface for normalizing engine-specific EXPLAIN plan formats
 * into a common ExplainNode tree structure for visualization.
 */
export interface ExplainPlanNormalizer {
    /**
     * Normalizes a raw EXPLAIN plan into a common tree structure.
     * @param rawPlan - The raw EXPLAIN output in the engine's native format
     * @returns A normalized tree root and metadata
     */
    normalize(rawPlan: unknown): {
        root: ExplainNode | null;
        meta: ExplainMeta;
    };
}
//# sourceMappingURL=ExplainPlanNormalizer.d.ts.map