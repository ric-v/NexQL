/** Shared notebook renderer branding (CSS variables). Renderer sandbox cannot read --pg-* webview tokens. */
export const BRAND_ACCENT = 'var(--vscode-textLink-foreground)';
export const BRAND_ACCENT_MUTED = 'color-mix(in srgb, var(--vscode-textLink-foreground) 20%, transparent)';

/** Mirror of webview glass tokens using VS Code theme vars only. */
export const RENDERER_GLASS_BG = 'color-mix(in srgb, var(--vscode-editor-background) 62%, transparent)';
export const RENDERER_GLASS_BLUR = 'blur(12px) saturate(1.15)';
export const RENDERER_ELEVATION_2 = '0 10px 28px color-mix(in srgb, #000 28%, transparent)';

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** VS Code chart color CSS variables for theme-aware Chart.js palettes. */
export const CHART_COLOR_VARS = [
  'var(--vscode-charts-blue)',
  'var(--vscode-charts-red)',
  'var(--vscode-charts-green)',
  'var(--vscode-charts-yellow)',
  'var(--vscode-charts-orange)',
  'var(--vscode-charts-purple)',
  'var(--vscode-charts-foreground)',
  'var(--vscode-charts-blue)',
] as const;

let chartPaletteCache: { fills: string[]; borders: string[] } | undefined;

function resolveCssColor(cssValue: string): string {
  if (typeof document === 'undefined') {
    return cssValue;
  }
  const probe = document.createElement('span');
  probe.style.color = cssValue;
  document.documentElement.appendChild(probe);
  const resolved = getComputedStyle(probe).color || cssValue;
  probe.remove();
  return resolved;
}

function withAlpha(rgb: string, alpha: number): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    return rgb;
  }
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

/** Resolve theme chart palette once per renderer session (Chart.js needs concrete colors). */
export function getThemeChartPalette(): { fills: string[]; borders: string[] } {
  if (chartPaletteCache) {
    return chartPaletteCache;
  }
  const borders = CHART_COLOR_VARS.map((v) => resolveCssColor(v));
  const fills = borders.map((c) => withAlpha(c, 0.6));
  chartPaletteCache = { fills, borders };
  return chartPaletteCache;
}

export function resetThemeChartPaletteCache(): void {
  chartPaletteCache = undefined;
}
