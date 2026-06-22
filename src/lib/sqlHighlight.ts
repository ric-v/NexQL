/** Lightweight SQL syntax highlight for webview previews (pairs with resources/highlight.css). */
export function highlightSql(sql: string): string {
  const escaped = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const keywords =
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|LIKE|BETWEEN|ORDER|GROUP|BY|HAVING|LIMIT|OFFSET|AS|DISTINCT|UNION|ALL|CREATE|DROP|ALTER|TABLE|VIEW|INDEX|INSERT|UPDATE|DELETE|INTO|VALUES|SET|CASE|WHEN|THEN|ELSE|END|WITH|RECURSIVE|EXPLAIN|ANALYZE)\b/gi;
  const strings = /('([^'\\]|\\.)*')/g;
  const comments = /(--.*)|(\/\*[\s\S]*?\*\/)/g;
  const functions = /\b([a-z_]\w*)\s*\(/gi;

  return escaped
    .replace(comments, '<span class="sql-comment">$&</span>')
    .replace(strings, '<span class="sql-string">$&</span>')
    .replace(keywords, '<span class="sql-keyword">$&</span>')
    .replace(functions, (_match, funcName: string) => `<span class="sql-function">${funcName}</span>(`);
}
