import type { DbClient } from './DbDriver';
/**
 * Recommendation for an existing index.
 */
export interface IndexRecommendation {
    /** Name of the index */
    indexName: string;
    /** Name of the table the index belongs to */
    tableName: string;
    /** Recommended action */
    recommendation: 'keep' | 'drop' | 'rebuild';
    /** Human-readable explanation for the recommendation */
    reason: string;
}
/**
 * Suggestion for a new index to improve query performance.
 */
export interface IndexSuggestion {
    /** The CREATE INDEX statement */
    createStatement: string;
    /** Estimated performance improvement description */
    estimatedImprovement: string;
    /** Human-readable explanation for the suggestion */
    reason: string;
}
/**
 * Interface for engine-specific index analysis and recommendations.
 */
export interface IndexAdvisor {
    /**
     * Analyzes existing indexes on a table and recommends actions.
     * @param schema - The schema containing the table
     * @param table - The table name
     * @param client - A database client for querying index statistics
     * @returns Recommendations for existing indexes
     */
    analyzeIndexUsage(schema: string, table: string, client: DbClient): Promise<IndexRecommendation[]>;
    /**
     * Analyzes a query and suggests new indexes that could improve performance.
     * @param query - The SQL query to analyze
     * @param client - A database client for querying metadata
     * @returns Suggestions for new indexes
     */
    suggestIndexes(query: string, client: DbClient): Promise<IndexSuggestion[]>;
}
//# sourceMappingURL=IndexAdvisor.d.ts.map