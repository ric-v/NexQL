import { Client } from 'pg';
import * as vscode from 'vscode';
import { loadPanelTemplate } from '../../../lib/template-loader';

interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_not_null: boolean;
    default_value: string | null;
    is_primary_key: boolean;
}

interface ConstraintInfo {
    constraint_name: string;
    constraint_type: string;
    definition: string;
}

interface SchemaInfo {
    owner: string;
    privileges: string[];
}

export class TablePropertiesPanel {
    public static async show(
        client: Client,
        schema: string,
        name: string,
        extensionUri: vscode.Uri,
        isView: boolean = false,
        isFunction: boolean = false,
        isSchema: boolean = false,
    ): Promise<void> {
        try {
            const panelTitle = isSchema ? `Schema: ${name}` : `${schema}.${name}`;
            const panel = vscode.window.createWebviewPanel(
                'postgresProperties',
                panelTitle,
                vscode.ViewColumn.One,
                { enableScripts: true, localResourceRoots: [extensionUri] },
            );

            let content = '';

            if (isSchema) {
                content = await this.getSchemaContent(client, name);
            } else if (isFunction) {
                content = await this.getFunctionContent(client, schema, name);
            } else {
                content = await this.getTableOrViewContent(client, schema, name, isView);
            }

            panel.webview.html = await this.getHtml(panel, extensionUri, panelTitle, content);
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error loading properties: ${err.message}`);
        }
    }

    private static async getSchemaContent(client: Client, name: string): Promise<string> {
        const query = `
            SELECT 
                pg_catalog.pg_get_userbyid(nspowner) as owner,
                array_agg(distinct format('%s ON %s TO %s', p.privilege_type, p.table_schema, p.grantee)) as privileges
            FROM pg_catalog.pg_namespace n
            LEFT JOIN information_schema.table_privileges p ON p.table_schema = n.nspname
            WHERE nspname = $1
            GROUP BY nspowner`;

        const result = await client.query(query, [name]);
        const info = result.rows[0] || { owner: 'Unknown', privileges: [] };

        return `
            <nav class="pg-tab-strip" role="tablist">
                <button type="button" class="pg-tab-btn active" onclick="openTab(event, 'General')">General</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'Security')">Security</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'SQL')">SQL</button>
            </nav>

            <div id="General" class="pg-tab-panel active">
                <div class="pg-info-grid">
                    <div class="label">Name</div><div class="value">${name}</div>
                    <div class="label">Owner</div><div class="value">${info.owner}</div>
                </div>
            </div>

            <div id="Security" class="pg-tab-panel">
                <div class="pg-list-container">
                    ${(info.privileges || []).map((p: string) => `<div class="pg-list-item">${p || 'No specific privileges'}</div>`).join('')}
                </div>
            </div>

            <div id="SQL" class="pg-tab-panel">
                <pre class="pg-sql-block">${this.formatSql(`CREATE SCHEMA ${name} AUTHORIZATION ${info.owner};`)}</pre>
            </div>
        `;
    }

    private static async getFunctionContent(client: Client, schema: string, name: string): Promise<string> {
        const query = `
            SELECT p.proname,
                   pg_get_function_arguments(p.oid) as arguments,
                   pg_get_function_result(p.oid) as result_type,
                   pg_get_functiondef(p.oid) as definition,
                   l.lanname as language
            FROM pg_proc p
            LEFT JOIN pg_language l ON p.prolang = l.oid
            WHERE p.proname = $1
            AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)`;

        const result = await client.query(query, [name, schema]);
        const info = result.rows[0];

        return `
            <nav class="pg-tab-strip" role="tablist">
                <button type="button" class="pg-tab-btn active" onclick="openTab(event, 'General')">General</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'Definition')">Definition</button>
            </nav>

            <div id="General" class="pg-tab-panel active">
                <div class="pg-info-grid">
                    <div class="label">Name</div><div class="value">${name}</div>
                    <div class="label">Schema</div><div class="value">${schema}</div>
                    <div class="label">Language</div><div class="value">${info.language}</div>
                    <div class="label">Returns</div><div class="value">${info.result_type}</div>
                    <div class="label">Arguments</div><div class="value">${info.arguments}</div>
                </div>
            </div>

            <div id="Definition" class="pg-tab-panel">
                <pre class="pg-sql-block">${this.formatSql(info.definition)}</pre>
            </div>
        `;
    }

    private static async getTableOrViewContent(client: Client, schema: string, name: string, isView: boolean): Promise<string> {
        if (isView) {
            return await this.getViewContent(client, schema, name);
        } else {
            return await this.getTableContent(client, schema, name);
        }
    }

    private static async getViewContent(client: Client, schema: string, name: string): Promise<string> {
        // Get general view information
        const generalQuery = `
            SELECT 
                c.relname as view_name,
                n.nspname as schema_name,
                pg_catalog.pg_get_userbyid(c.relowner) as owner,
                obj_description(c.oid, 'pg_class') as description,
                c.reltuples::bigint as estimated_rows,
                pg_size_pretty(pg_relation_size(c.oid)) as size
            FROM pg_catalog.pg_class c
            LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'v'
            AND n.nspname = $1
            AND c.relname = $2`;

        // Get columns
        const colQuery = `
            SELECT 
                a.attname as column_name,
                pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                a.attnotnull as is_not_null,
                (SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid) FROM pg_catalog.pg_attrdef d WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef) as default_value,
                col_description(a.attrelid, a.attnum) as description
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = '${schema}.${name}'::regclass AND a.attnum > 0 AND NOT a.attisdropped
            ORDER BY a.attnum`;

        // Get view definition
        const defQuery = `SELECT pg_get_viewdef('${schema}.${name}'::regclass, true) as definition`;

        // Get dependent objects
        const depsQuery = `
            SELECT DISTINCT
                dependent_ns.nspname as schema,
                dependent_view.relname as name,
                dependent_view.relkind as kind
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
            WHERE pg_depend.refobjid = '${schema}.${name}'::regclass
            AND dependent_view.relname != '${name}'`;

        // Get referenced objects
        const refsQuery = `
            SELECT DISTINCT
                ref_nsp.nspname as schema,
                ref_class.relname as name,
                ref_class.relkind as kind
            FROM pg_depend dep
            JOIN pg_rewrite rew ON dep.objid = rew.oid
            JOIN pg_class ref_class ON dep.refobjid = ref_class.oid
            JOIN pg_namespace ref_nsp ON ref_nsp.oid = ref_class.relnamespace
            WHERE rew.ev_class = '${schema}.${name}'::regclass
            AND ref_class.relname != '${name}'
            AND ref_class.relkind IN ('r', 'v', 'm')`;

        const generalRes = await client.query(generalQuery, [schema, name]);
        const colRes = await client.query(colQuery);
        const defRes = await client.query(defQuery);
        const depsRes = await client.query(depsQuery);
        const refsRes = await client.query(refsQuery);

        const general = generalRes.rows[0] || {};
        const columns = colRes.rows;
        const definition = defRes.rows[0]?.definition || '';
        const dependents = depsRes.rows;
        const references = refsRes.rows;

        const getKindLabel = (kind: string) => {
            switch (kind) {
                case 'r': return 'Table';
                case 'v': return 'View';
                case 'm': return 'Materialized View';
                default: return kind;
            }
        };

        return `
            <nav class="pg-tab-strip" role="tablist">
                <button type="button" class="pg-tab-btn active" onclick="openTab(event, 'General')">General</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'Columns')">Columns</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'Dependencies')">Dependencies</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'SQL')">SQL</button>
            </nav>

            <div id="General" class="pg-tab-panel active">
                <div class="pg-info-grid">
                    <div class="label">View Name</div><div class="value">${general.view_name || name}</div>
                    <div class="label">Schema</div><div class="value">${general.schema_name || schema}</div>
                    <div class="label">Owner</div><div class="value">${general.owner || 'Unknown'}</div>
                    <div class="label">Description</div><div class="value">${general.description || '<em>No description</em>'}</div>
                    <div class="label">Estimated Rows</div><div class="value">${general.estimated_rows || 'N/A'}</div>
                    <div class="label">Size</div><div class="value">${general.size || 'N/A'}</div>
                </div>
            </div>

            <div id="Columns" class="pg-tab-panel">
                <table class="pg-data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Default</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${columns.map((c: any) => `
                            <tr>
                                <td>${c.column_name}</td>
                                <td>${c.data_type}</td>
                                <td>${!c.is_not_null ? 'Yes' : 'No'}</td>
                                <td>${c.default_value || ''}</td>
                                <td>${c.description || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div id="Dependencies" class="pg-tab-panel">
                <h3>Referenced Objects</h3>
                <p class="pg-text-meta" style="margin-bottom:10px;">
                    Objects that this view depends on:
                </p>
                <table class="pg-data-table">
                    <thead>
                        <tr>
                            <th>Schema</th>
                            <th>Name</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${references.length > 0 ? references.map((r: any) => `
                            <tr>
                                <td>${r.schema}</td>
                                <td>${r.name}</td>
                                <td>${getKindLabel(r.kind)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground);">No dependencies</td></tr>'}
                    </tbody>
                </table>

                <h3 style="margin-top: 30px;">Dependent Objects</h3>
                <p class="pg-text-meta" style="margin-bottom:10px;">
                    Objects that depend on this view:
                </p>
                <table class="pg-data-table">
                    <thead>
                        <tr>
                            <th>Schema</th>
                            <th>Name</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dependents.length > 0 ? dependents.map((d: any) => `
                            <tr>
                                <td>${d.schema}</td>
                                <td>${d.name}</td>
                                <td>${getKindLabel(d.kind)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align: center; color: var(--vscode-descriptionForeground);">No dependent objects</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div id="SQL" class="pg-tab-panel">
                <pre class="pg-sql-block">${this.formatSql(`CREATE OR REPLACE VIEW ${schema}.${name} AS\n${definition}`)}</pre>
            </div>
        `;
    }

    private static async getTableContent(client: Client, schema: string, name: string): Promise<string> {
        // Get columns
        const colQuery = `
            SELECT 
                a.attname as column_name,
                pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                a.attnotnull as is_not_null,
                (SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid) FROM pg_catalog.pg_attrdef d WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef) as default_value,
                CASE WHEN pc.contype = 'p' THEN true ELSE false END as is_primary_key
            FROM pg_catalog.pg_attribute a
            LEFT JOIN pg_catalog.pg_constraint pc ON pc.conrelid = a.attrelid AND a.attnum = ANY(pc.conkey) AND pc.contype = 'p'
            WHERE a.attrelid = '${schema}.${name}'::regclass AND a.attnum > 0 AND NOT a.attisdropped
            ORDER BY a.attnum`;

        // Get constraints
        const conQuery = `
            SELECT conname as constraint_name, contype as constraint_type, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = '${schema}.${name}'::regclass`;

        // Get definition (simplified for tables)
        const defQuery = `SELECT 'CREATE TABLE ${schema}.${name} ...' as definition`;

        const colRes = await client.query(colQuery);
        const conRes = await client.query(conQuery);
        const defRes = await client.query(defQuery);

        const columns = colRes.rows;
        const constraints = conRes.rows;
        const definition = defRes.rows[0]?.definition || '';

        return `
            <nav class="pg-tab-strip" role="tablist">
                <button type="button" class="pg-tab-btn active" onclick="openTab(event, 'Columns')">Columns</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'Constraints')">Constraints</button>
                <button type="button" class="pg-tab-btn" onclick="openTab(event, 'SQL')">SQL</button>
            </nav>

            <div id="Columns" class="pg-tab-panel active">
                <table class="pg-data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Default</th>
                            <th>PK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${columns.map((c: ColumnInfo) => `
                            <tr>
                                <td class="${c.is_primary_key ? 'pk' : ''}">${c.column_name}</td>
                                <td>${c.data_type}</td>
                                <td>${!c.is_not_null ? 'Yes' : 'No'}</td>
                                <td>${c.default_value || ''}</td>
                                <td>${c.is_primary_key ? 'Yes' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div id="Constraints" class="pg-tab-panel">
                <table class="pg-data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Definition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${constraints.map((c: ConstraintInfo) => `
                            <tr>
                                <td>${c.constraint_name}</td>
                                <td>${this.getConstraintType(c.constraint_type)}</td>
                                <td>${c.definition}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div id="SQL" class="pg-tab-panel">
                <pre class="pg-sql-block">${this.formatSql(definition)}</pre>
            </div>
        `;
    }

    private static getConstraintType(type: string): string {
        switch (type) {
            case 'p': return 'Primary Key';
            case 'f': return 'Foreign Key';
            case 'u': return 'Unique';
            case 'c': return 'Check';
            default: return type;
        }
    }

    private static formatSql(sql: string): string {
        return sql
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\b(CREATE|TABLE|VIEW|SCHEMA|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|GRANT|REVOKE|ALTER|DROP)\b/g, '<span class="keyword">$1</span>');
    }

    private static async getHtml(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        title: string,
        content: string,
    ): Promise<string> {
        return loadPanelTemplate(panel.webview, extensionUri, 'table-properties', {
            PAGE_TITLE: title,
            CONTENT: content,
        });
    }
}
