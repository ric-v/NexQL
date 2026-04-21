/**
 * Prepare nightly manifests for per-package nightly/pre-release publishing.
 *
 * Usage:
 *   node scripts/prepare-nightly-manifests.js --package=<name> --version=<version>
 *
 * Flags:
 *   --package=<name>    Package directory name under packages/ (e.g., "core", "ext-postgres")
 *   --version=<version> Nightly version string (e.g., "1.1.42")
 *
 * The script reads the target package's package.json, generates two nightly
 * manifest variants (VS Code Marketplace pre-release and Open VSX nightly companion),
 * and writes them to <package-dir>/.nightly/.
 *
 * Open VSX nightly companions get "-nightly" appended to their extension name
 * (e.g., "ric-v.nexql-nightly", "ric-v.postgres-explorer-nightly").
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse CLI flags in the form --key=value
 */
function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

/**
 * Ensure the description ends with " [Nightly]"
 */
function ensureNightlySuffix(description) {
  const suffix = ' [Nightly]';
  if (typeof description !== 'string') {
    return suffix.trim();
  }
  return description.includes(suffix) ? description : `${description}${suffix}`;
}

/**
 * Derive the Open VSX nightly companion name from the package name.
 * E.g., "postgres-explorer" -> "postgres-explorer-nightly"
 *        "nexql" -> "nexql-nightly"
 *        "nexql-mysql" -> "nexql-mysql-nightly"
 */
function deriveOpenVsxNightlyName(extensionName) {
  if (extensionName.endsWith('-nightly')) {
    return extensionName;
  }
  return `${extensionName}-nightly`;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.package) {
    console.error('Error: --package=<name> flag is required');
    console.error('Usage: node scripts/prepare-nightly-manifests.js --package=core --version=1.1.42');
    process.exit(1);
  }

  if (!args.version) {
    console.error('Error: --version=<version> flag is required');
    console.error('Usage: node scripts/prepare-nightly-manifests.js --package=core --version=1.1.42');
    process.exit(1);
  }

  const packageName = args.package;
  const nightlyVersion = args.version;

  // Resolve the package directory relative to the monorepo root
  const repoRoot = path.resolve(__dirname, '..');
  const packageDir = path.join(repoRoot, 'packages', packageName);
  const pkgPath = path.join(packageDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error(`Error: package.json not found at ${pkgPath}`);
    console.error(`Make sure --package refers to a valid directory under packages/`);
    process.exit(1);
  }

  const basePackage = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const outDir = path.join(packageDir, '.nightly');

  // VS Code Marketplace pre-release manifest
  const marketplaceNightly = {
    ...basePackage,
    version: nightlyVersion,
    description: ensureNightlySuffix(basePackage.description),
  };

  // Open VSX nightly companion manifest (separate extension with -nightly suffix)
  const openVsxNightlyName = deriveOpenVsxNightlyName(basePackage.name);
  const openVsxNightly = {
    ...basePackage,
    name: openVsxNightlyName,
    displayName: `${basePackage.displayName} Nightly`,
    version: nightlyVersion,
    description: ensureNightlySuffix(basePackage.description),
  };

  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'package.marketplace.json'),
    `${JSON.stringify(marketplaceNightly, null, 2)}\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, 'package.openvsx.json'),
    `${JSON.stringify(openVsxNightly, null, 2)}\n`,
    'utf8'
  );

  console.log(`Generated nightly manifests for packages/${packageName} at version ${nightlyVersion}`);
  console.log(`  -> ${path.relative(repoRoot, path.join(outDir, 'package.marketplace.json'))}`);
  console.log(`  -> ${path.relative(repoRoot, path.join(outDir, 'package.openvsx.json'))}`);
}

main();
