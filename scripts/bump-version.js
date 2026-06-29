const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

function parseBaseSemver(versionField) {
  if (typeof versionField !== 'string') {
    throw new Error('Version must be a string');
  }
  const core = versionField.split('-')[0];
  const parts = core.split('.');
  if (parts.length !== 3) {
    throw new Error(`Expected major.minor.patch, got: ${versionField}`);
  }
  const nums = parts.map((p) => {
    const n = Number(p);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid semver segment in version: ${versionField}`);
    }
    return n;
  });
  return [nums[0], nums[1], nums[2]];
}

function getNextVersion(currentVersion, channel, bumpType) {
  let [major, minor, patch] = parseBaseSemver(currentVersion);

  if (bumpType === 'major') {
    major += 1;
    minor = (channel === 'nightly') ? 1 : 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    if (channel === 'stable') {
      minor = (minor % 2 === 0) ? minor + 2 : minor + 1;
    } else {
      minor = (minor % 2 === 0) ? minor + 1 : minor + 2;
    }
    patch = 0;
  } else if (bumpType === 'patch') {
    if (channel === 'stable' && minor % 2 !== 0) {
      minor += 1;
      patch = 0;
    } else if (channel === 'nightly' && minor % 2 === 0) {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }
  } else {
    throw new Error(`Invalid bump type: ${bumpType}`);
  }

  return `${major}.${minor}.${patch}`;
}

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error('Error: package.json not found in the current working directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;
  console.log(`Current version: ${currentVersion}`);

  // Parse command line arguments
  let channelArg = process.argv.find(arg => ['stable', 'nightly'].includes(arg.toLowerCase()));
  let bumpArg = process.argv.find(arg => ['patch', 'minor', 'major', 'fix'].includes(arg.toLowerCase()));
  const skipConfirm = process.argv.includes('-y') || process.argv.includes('--yes');

  if (bumpArg === 'fix') {
    bumpArg = 'patch';
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    let channel = channelArg;
    if (!channel) {
      console.log('\nSelect Release Channel:');
      console.log('  1) Stable  (even minor version)');
      console.log('  2) Nightly (odd minor version)');
      const answer = await askQuestion(rl, 'Choose [1-2, default: stable]: ');
      if (answer.trim() === '2' || answer.toLowerCase().startsWith('n')) {
        channel = 'nightly';
      } else {
        channel = 'stable';
      }
    }

    let bumpType = bumpArg;
    if (!bumpType) {
      console.log('\nSelect Release Type:');
      console.log('  1) patch — patch bump (e.g. 1.0.0 → 1.0.1)');
      console.log('  2) minor — minor bump (e.g. 1.0.0 → 1.1.0)');
      console.log('  3) major — major bump (e.g. 1.0.0 → 2.0.0)');
      const answer = await askQuestion(rl, 'Choose [1-3]: ');
      if (answer.trim() === '1' || answer.toLowerCase() === 'patch' || answer.toLowerCase() === 'fix') {
        bumpType = 'patch';
      } else if (answer.trim() === '2' || answer.toLowerCase() === 'minor') {
        bumpType = 'minor';
      } else if (answer.trim() === '3' || answer.toLowerCase() === 'major') {
        bumpType = 'major';
      } else {
        console.error(`Invalid choice: ${answer}`);
        process.exit(1);
      }
    }

    const nextVersion = getNextVersion(currentVersion, channel, bumpType);
    console.log(`\nNext version computed: v${nextVersion} (${channel} release)`);

    if (!skipConfirm) {
      const confirm = await askQuestion(rl, `Proceed with v${nextVersion}? [y/N]: `);
      if (!['y', 'yes'].includes(confirm.trim().toLowerCase())) {
        console.log('Aborted.');
        process.exit(0);
      }
    }

    // Write updated version to package.json
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('package.json updated.');

    // Execute Git commands
    console.log('Executing Git commands...');
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(`git commit -m "Bump version to ${nextVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a "v${nextVersion}" -m "Release v${nextVersion}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    execSync(`git push origin "v${nextVersion}"`, { stdio: 'inherit' });
    console.log(`Git tag v${nextVersion} created and pushed successfully.`);

  } catch (error) {
    console.error('Error during execution:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}
