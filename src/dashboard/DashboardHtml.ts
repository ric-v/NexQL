import * as vscode from 'vscode';
import { DashboardStats } from '../common/types';
import { MODERN_WEBVIEW_BASE_CSS } from '../common/htmlStyles';
import { readSharedTemplateCss } from '../lib/template-loader';

export async function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, stats: DashboardStats, color?: string): Promise<string> {
  const nonce = getNonce();
  const cspSource = webview.cspSource;

  try {
    const templatesDir = vscode.Uri.joinPath(extensionUri, 'templates', 'dashboard');
    const [htmlBuffer, cssBuffer, jsBuffer, sharedCss] = await Promise.all([
      vscode.workspace.fs.readFile(vscode.Uri.joinPath(templatesDir, 'index.html')),
      vscode.workspace.fs.readFile(vscode.Uri.joinPath(templatesDir, 'styles.css')),
      vscode.workspace.fs.readFile(vscode.Uri.joinPath(templatesDir, 'scripts.js')),
      readSharedTemplateCss(extensionUri)
    ]);

    let html = new TextDecoder().decode(htmlBuffer);
    const css = new TextDecoder().decode(cssBuffer);
    const js = new TextDecoder().decode(jsBuffer);
    const inlineStyles = `${MODERN_WEBVIEW_BASE_CSS}\n${sharedCss}\n${css}`;

    // Security: Content Security Policy
    const csp = `default-src 'none'; img-src ${cspSource} https:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;`;

    const statsJson = JSON.stringify(stats)
      .replace(/&/g, '\\u0026')
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    html = html.replace('{{CSP}}', () => csp);
    html = html.replace('{{STATS_JSON}}', () => statsJson);
    html = html.replace('{{INLINE_STYLES}}', () => inlineStyles);
    html = html.replace('{{INLINE_SCRIPTS}}', () => js);
    html = html.replace('{{NONCE}}', () => nonce);

    let headerStyle = '';
    if (color) {
      const colorMap: Record<string, { bg: string, border: string }> = {
        red: { bg: 'rgba(248, 113, 113, 0.08)', border: 'var(--vscode-errorForeground, #f87171)' },
        orange: { bg: 'rgba(250, 204, 21, 0.08)', border: 'var(--vscode-editorWarning-foreground, #facc15)' },
        blue: { bg: 'rgba(59, 130, 246, 0.08)', border: 'var(--vscode-textLink-foreground, #3b82f6)' },
        green: { bg: 'rgba(74, 222, 128, 0.08)', border: 'var(--vscode-testing-iconPassed, #4ade80)' },
        gray: { bg: 'rgba(128, 128, 128, 0.08)', border: 'var(--vscode-descriptionForeground, #808080)' }
      };
      const themeColor = colorMap[color];
      if (themeColor) {
        headerStyle = `background: linear-gradient(180deg, ${themeColor.bg} 0%, transparent 100%); border-bottom: 2px solid ${themeColor.border}; padding-bottom: 8px; margin-bottom: 8px;`;
      }
    }
    html = html.replace('{{HEADER_STYLE}}', () => headerStyle);

    return html;
  } catch (error) {
    console.error('Failed to load dashboard templates:', error);
    return getErrorHtml(error instanceof Error ? error.message : String(error));
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function getErrorHtml(error: string) {
  return `<!DOCTYPE html>
    <html>
      <head>
        <style>${MODERN_WEBVIEW_BASE_CSS}</style>
      </head>
        <body style="padding: 20px; color: #f87171; font-family: sans-serif;">
            <section class="pg-panel">
              <header class="pg-panel-header">
                <div>
                  <h3 class="pg-panel-title">Dashboard Error</h3>
                  <p class="pg-panel-subtitle">Failed to load dashboard resources.</p>
                </div>
              </header>
              <div class="pg-panel-body">
                <div class="pg-banner error"><strong>Load failure</strong> in dashboard template pipeline.</div>
                <pre>${error}</pre>
              </div>
            </section>
        </body>
    </html>`;
}

/** Sentinel matched by DashboardPanel to swap loading shell for full dashboard (must stay in sync). */
export const DASHBOARD_LOADING_SHELL_MARKER = 'data-pg-dashboard-loading="1"';

export function getLoadingHtml(): string {
  return `<!DOCTYPE html>
    <html ${DASHBOARD_LOADING_SHELL_MARKER}>
      <head>
        <title>Loading</title>
        <style>${MODERN_WEBVIEW_BASE_CSS}</style>
      </head>
      <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;">
        <div class="pg-panel" style="width:min(560px, 92vw);">
          <div class="pg-panel-body">
            <div class="empty-state-simple">
              <div class="skeleton skeleton-text" style="width: 120px;"></div>
              <span>Loading dashboard metrics...</span>
            </div>
          </div>
        </div>
      </body>
    </html>`;
}
