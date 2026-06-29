import * as vscode from 'vscode';

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  enum?: string[];
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterProperty>;
    required: string[];
  };
}

export const DB_TOOLS: ToolSpec[] = [
  {
    name: 'select_connection_context',
    description: 'Ask the user to choose or confirm a database connection to use for the conversation when the prompt is vague, lacks context, or references a database not currently selected.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'The explanation to show the user as to why they are being prompted to select a connection (e.g. "I need to know which database contains the active brands table").'
        }
      },
      required: ['reason']
    }
  },
  {
    name: 'search_schema',
    description: 'Search the database schema index using natural language or keywords to find tables, views, materialized views, and functions matching the query.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or keywords (e.g. "users", "order transactions", "active clients").'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'describe_object',
    description: 'Get structural details of a specific database object (table, view, or materialized view) including columns, data types, constraints, and indexes.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Fully qualified reference to the database object in format "schema.object_name" (e.g., "public.users").'
        }
      },
      required: ['ref']
    }
  },
  {
    name: 'get_join_path',
    description: 'Find the shortest path of join relationships and foreign keys between two database tables.',
    parameters: {
      type: 'object',
      properties: {
        a: {
          type: 'string',
          description: 'Fully qualified reference to the first table (e.g., "public.orders").'
        },
        b: {
          type: 'string',
          description: 'Fully qualified reference to the second table (e.g., "public.customers").'
        }
      },
      required: ['a', 'b']
    }
  },
  {
    name: 'sample_values',
    description: 'Retrieve a list of sample values from a specific table column to inspect its contents. Only works on read-only SELECT queries.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Fully qualified reference to the table (e.g., "public.users").'
        },
        col: {
          type: 'string',
          description: 'The name of the column to sample (e.g., "status").'
        }
      },
      required: ['ref', 'col']
    }
  },
  {
    name: 'run_select',
    description: 'Run a read-only SELECT or WITH query against the database to fetch actual data rows. Modifying queries (INSERT, UPDATE, DELETE, etc.) are strictly prohibited.',
    parameters: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The SQL SELECT or WITH query to execute.'
        }
      },
      required: ['sql']
    }
  },
  {
    name: 'explain_query',
    description: 'Get the EXPLAIN query execution plan for a SELECT or WITH SQL query to analyze its performance and bottlenecks.',
    parameters: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The SQL SELECT or WITH query to explain.'
        }
      },
      required: ['sql']
    }
  }
];

/** Maps a ToolSpec to OpenAI / Ollama tool format. */
export function mapToOpenAiTools(specs: ToolSpec[]): any[] {
  return specs.map(spec => ({
    type: 'function',
    function: {
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters
    }
  }));
}

/** Maps a ToolSpec to Anthropic tool format. */
export function mapToAnthropicTools(specs: ToolSpec[]): any[] {
  return specs.map(spec => ({
    name: spec.name,
    description: spec.description,
    input_schema: spec.parameters
  }));
}

/** Maps a ToolSpec to Gemini tool format. */
export function mapToGeminiTools(specs: ToolSpec[]): any[] {
  return specs.map(spec => {
    // Gemini parameters properties require uppercase types (e.g. OBJECT, STRING)
    const properties: Record<string, any> = {};
    for (const [key, prop] of Object.entries(spec.parameters.properties)) {
      properties[key] = {
        type: prop.type.toUpperCase(),
        description: prop.description,
        ...(prop.enum ? { enum: prop.enum } : {})
      };
    }

    return {
      name: spec.name,
      description: spec.description,
      parameters: {
        type: 'OBJECT',
        properties,
        required: spec.parameters.required
      }
    };
  });
}

/** Maps a ToolSpec to VS Code LM LanguageModelChatTool format. */
export function mapToVsCodeLmTools(specs: ToolSpec[]): any[] {
  return specs.map(spec => {
    // vscode.LanguageModelChatTool expects inputSchema to match JSON Schema
    return {
      name: spec.name,
      description: spec.description,
      inputSchema: spec.parameters
    } as any; // Cast as any to avoid strict version mismatch if types differ slightly
  });
}
