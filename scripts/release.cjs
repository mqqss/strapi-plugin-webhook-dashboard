#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2];

const usage = [
  'Usage:',
  '  npm run release:check',
  '  npm run release:publish',
  '',
  'release:check runs the release verification without pushing or publishing.',
  'release:publish verifies, creates the version tag, pushes main and tag, then publishes to npm.',
].join('\n');

if (!['--check', '--publish'].includes(mode)) {
  console.error(usage);
  process.exit(1);
}

const isPublish = mode === '--publish';

const run = (command, args, options = {}) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
};

const capture = (command, args) =>
  execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  }).trim();

const fail = (message) => {
  console.error(`\nRelease aborted: ${message}`);
  process.exit(1);
};

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const packageName = packageJson.name;
const tagName = `v${version}`;

const gitStatus = () => capture('git', ['status', '--porcelain']);

const assertCleanWorktree = () => {
  const status = gitStatus();
  if (status) {
    fail(`working tree is not clean. Commit or discard changes first:\n${status}`);
  }
};

const assertMainBranch = () => {
  const branch = capture('git', ['branch', '--show-current']);
  if (branch !== 'main') {
    fail(`release must be run from main, current branch is ${branch || '<detached>'}`);
  }
};

const assertRemoteIsAncestor = () => {
  run('git', ['fetch', 'origin', 'main', '--tags']);
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], {
      cwd: root,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
  } catch {
    fail('origin/main is not an ancestor of HEAD. Pull or rebase before releasing.');
  }
};

const assertNpmVersionAvailable = () => {
  const spec = `${packageName}@${version}`;
  try {
    const publishedVersion = capture('npm', ['view', spec, 'version']);
    if (publishedVersion === version) {
      fail(`${spec} already exists on npm. Bump the package version first.`);
    }
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    if (!output.includes('E404') && !output.includes('No match found')) {
      fail(`could not check npm version for ${spec}.\n${output}`);
    }
  }
};

const listFiles = (directory) => {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
};

const assertNoSourcemaps = () => {
  const distPath = path.join(root, 'dist');
  const files = listFiles(distPath);
  const mapFiles = files.filter((file) => file.endsWith('.map'));
  if (mapFiles.length > 0) {
    fail(`dist contains sourcemap files:\n${mapFiles.map((file) => path.relative(root, file)).join('\n')}`);
  }

  const mappedDeclarations = files.filter(
    (file) => file.endsWith('.d.ts') && fs.readFileSync(file, 'utf8').includes('sourceMappingURL')
  );

  if (mappedDeclarations.length > 0) {
    fail(
      `declaration files still reference sourcemaps:\n${mappedDeclarations
        .map((file) => path.relative(root, file))
        .join('\n')}`
    );
  }
};

const ensureTag = () => {
  const head = capture('git', ['rev-parse', 'HEAD']);

  try {
    const taggedCommit = capture('git', ['rev-parse', `${tagName}^{}`]);
    if (taggedCommit !== head) {
      fail(`${tagName} already exists but does not point to HEAD.`);
    }
  } catch {
    run('git', ['tag', '-a', tagName, '-m', `Release ${tagName}`]);
  }
};

console.log(`Preparing ${packageName}@${version}`);

if (isPublish) {
  assertCleanWorktree();
  assertMainBranch();
  assertRemoteIsAncestor();
}

assertNpmVersionAvailable();

run('npm', ['run', 'test']);
run('npm', ['run', 'build']);
assertNoSourcemaps();
run('npm', ['run', 'verify']);
run('npm', ['pack', '--dry-run']);
assertNoSourcemaps();

if (!isPublish) {
  const status = gitStatus();
  if (status) {
    console.log('\nRelease check passed. Working tree still has uncommitted changes:');
    console.log(status);
  } else {
    console.log('\nRelease check passed. Working tree is clean.');
  }
  process.exit(0);
}

ensureTag();
run('git', ['push', 'origin', 'main']);
run('git', ['push', 'origin', tagName]);
run('npm', ['publish', '--access', 'public']);

console.log(`\nReleased ${packageName}@${version}`);
