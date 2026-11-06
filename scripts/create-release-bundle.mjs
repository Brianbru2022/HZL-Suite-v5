import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const tauriConfig = JSON.parse(readFileSync(path.join(repoRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const cargoCommand = isWindows ? 'cargo.exe' : 'cargo';
const skipChecks = process.argv.includes('--skip-checks');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '-');
const productName = tauriConfig.productName || packageJson.name || 'HZL QS Suite';
const safeProductName = productName.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const version = tauriConfig.version || packageJson.version || 'unknown';
const releaseTag = `v${version}`;
const signingCertificateThumbprint = (process.env.HZL_SIGNING_CERTIFICATE_THUMBPRINT || '').trim();
const releaseRoot = path.join(os.homedir(), 'Downloads', `${safeProductName}-Release-${version}-${timestamp}`);
const artifactRoot = path.join(releaseRoot, 'installers');
const tauriBundleRoot = path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle');

function run(command, args, options = {}) {
  const label = [command, ...args].join(' ');
  console.log(`\n> ${label}`);
  const startedAt = Date.now();
  const isCmdShim = isWindows && command.toLowerCase().endsWith('.cmd');
  execFileSync(command, args, {
    cwd: options.cwd || repoRoot,
    stdio: 'inherit',
    env: process.env,
    shell: isCmdShim,
  });
  return {
    command: label,
    cwd: options.cwd || repoRoot,
    durationMs: Date.now() - startedAt,
  };
}

function capture(command, args, options = {}) {
  try {
    const isCmdShim = isWindows && command.toLowerCase().endsWith('.cmd');
    return execFileSync(command, args, {
      cwd: options.cwd || repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isCmdShim,
    }).trim();
  } catch (error) {
    return options.fallback || '';
  }
}

function listFilesRecursive(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };
  walk(root);
  return files.sort();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function copyIfExists(filename) {
  const source = path.join(repoRoot, filename);
  if (!existsSync(source)) return false;
  copyFileSync(source, path.join(releaseRoot, filename));
  return true;
}

function extractReleaseChecklistItems() {
  const source = path.join(repoRoot, 'utils', 'releaseSmokeChecklist.ts');
  if (!existsSync(source)) return [];
  const text = readFileSync(source, 'utf8');
  const matches = [...text.matchAll(/group:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'[\s\S]*?detail:\s*'([^']+)'/g)];
  return matches.map((match) => ({
    group: match[1],
    title: match[2],
    detail: match[3],
  }));
}

function writeSmokeChecklistTemplate() {
  const checklistItems = extractReleaseChecklistItems();
  const lines = [
    '# Release Smoke Checklist Status',
    '',
    'This file is generated with every release bundle. The live in-app checklist status is stored in the local app profile, so this bundle includes a fresh release checklist template.',
    '',
  ];

  if (checklistItems.length === 0) {
    lines.push('No release smoke checklist items were found in the source tree.');
  } else {
    const groups = [...new Set(checklistItems.map((item) => item.group))];
    for (const group of groups) {
      lines.push(`## ${group}`, '');
      checklistItems
        .filter((item) => item.group === group)
        .forEach((item) => {
          lines.push(`- [ ] ${item.title}`);
          lines.push(`  - ${item.detail}`);
        });
      lines.push('');
    }
  }

  writeFileSync(path.join(releaseRoot, 'RELEASE_SMOKE_CHECKLIST_STATUS.md'), lines.join('\n'), 'utf8');
}

function copyInstallerArtifacts() {
  if (!existsSync(tauriBundleRoot)) {
    throw new Error(`Tauri bundle folder was not found: ${tauriBundleRoot}`);
  }

  mkdirSync(artifactRoot, { recursive: true });
  const artifactFiles = listFilesRecursive(tauriBundleRoot).filter((file) => {
    const lower = file.toLowerCase();
    const base = path.basename(file);
    return base.includes(productName)
      && base.includes(version)
      && /\.(msi|exe|appx|appimage|deb|rpm|dmg|pkg|zip|tar\.gz|gz|sig|json)$/.test(lower);
  });

  if (artifactFiles.length === 0) {
    throw new Error(`No current ${productName} ${version} installer artifacts were found under: ${tauriBundleRoot}`);
  }

  if (isWindows) {
    if (!signingCertificateThumbprint) {
      throw new Error(`Refusing to create a Windows release bundle without a code-signing certificate. Set HZL_SIGNING_CERTIFICATE_THUMBPRINT before releasing ${releaseTag}.`);
    }
    const signScript = path.join(repoRoot, 'scripts', 'sign-windows-installer.ps1');
    const verifyScript = path.join(repoRoot, 'scripts', 'verify-windows-installer-signature.ps1');
    const installers = artifactFiles.filter((file) => /\.(msi|exe)$/i.test(file));
    if (installers.length === 0) throw new Error('No Windows .msi or .exe installer was produced to sign.');
    installers.forEach((installer) => {
      run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', signScript, '-InstallerPath', installer, '-CertificateThumbprint', signingCertificateThumbprint]);
      run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', verifyScript, '-InstallerPath', installer]);
    });
  }

  for (const file of artifactFiles) {
    const relative = path.relative(tauriBundleRoot, file);
    const destination = path.join(artifactRoot, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }

  return artifactFiles.map((file) => ({
    source: file,
    relative: path.relative(tauriBundleRoot, file),
    size: statSync(file).size,
  }));
}

function writeManifest({ commandResults, artifactFiles, copiedDocs, gitInfo }) {
  const lines = [
    `${productName} release bundle`,
    '',
    `Created: ${new Date().toISOString()}`,
    `Product: ${productName}`,
    `Package: ${packageJson.name}`,
    `Version: ${version}`,
    `Repo: ${repoRoot}`,
    `Branch: ${gitInfo.branch || 'unknown'}`,
    `Commit: ${gitInfo.commit || 'unknown'}`,
    `Release tag: ${releaseTag}`,
    `Windows installer signing: ${isWindows ? 'verified' : 'not applicable'}`,
    '',
    'Checks:',
    ...(skipChecks ? ['- Skipped with --skip-checks'] : commandResults.map((entry) => `- ${entry.command} (${Math.round(entry.durationMs / 1000)}s)`)),
    '',
    'Installer Artifacts:',
    ...artifactFiles.map((entry) => `- installers/${entry.relative} (${formatBytes(entry.size)})`),
    '',
    'Included Documents:',
    ...copiedDocs.map((doc) => `- ${doc}`),
    '- RELEASE_SMOKE_CHECKLIST_STATUS.md',
    '',
    'Git Status At Bundle Time:',
    gitInfo.status || '(clean)',
    '',
    'Manual Release Steps:',
    '- Open the installer from this folder on a test machine/profile.',
    '- Run the in-app Diagnostics release smoke checklist.',
    '- Copy Diagnostics if any import/export/storage issue appears.',
    '- Keep this folder together with the installer as the release record.',
    '',
  ];

  writeFileSync(path.join(releaseRoot, 'RELEASE_BUNDLE_MANIFEST.txt'), lines.join('\n'), 'utf8');
}

function assertReleaseSourceIsFrozen() {
  const status = capture('git', ['status', '--short'], { fallback: '' });
  if (status) throw new Error(`Refusing to bundle an unfrozen source tree. Commit the intended release changes and tag HEAD as ${releaseTag}.\n\n${status}`);
  const tagsAtHead = capture('git', ['tag', '--points-at', 'HEAD'], { fallback: '' }).split(/\r?\n/).filter(Boolean);
  if (!tagsAtHead.includes(releaseTag)) throw new Error(`Refusing to bundle an untagged source revision. Tag the reviewed release commit as ${releaseTag}.`);
}

function main() {
  assertReleaseSourceIsFrozen();
  run(process.execPath, [path.join(scriptDir, 'verify-pilot-reconciliations.mjs')]);
  mkdirSync(releaseRoot, { recursive: true });
  const commandResults = [];

  if (!skipChecks) {
    commandResults.push(run(npmCommand, ['run', 'lint']));
    commandResults.push(run(npmCommand, ['test', '--', '--run']));
    commandResults.push(run(npmCommand, ['run', 'build']));
    commandResults.push(run(cargoCommand, ['check'], { cwd: path.join(repoRoot, 'src-tauri') }));
    if (existsSync(tauriBundleRoot)) {
      console.log(`\nCleaning stale Tauri bundle output:\n${tauriBundleRoot}`);
      rmSync(tauriBundleRoot, { recursive: true, force: true });
    }
    commandResults.push(run(npmCommand, ['run', 'tauri', '--', 'build']));
  } else {
    console.log('Skipping checks/build because --skip-checks was supplied.');
  }

  const artifactFiles = copyInstallerArtifacts();
  const copiedDocs = ['RELEASE_NOTES_0.1.11.md', 'CHANGELOG.md', 'KNOWN_LIMITATIONS.md', 'KNOWN_ISSUES.md', 'SUPPORT_PROCESS.md', 'PILOT_PROGRAMME.md', 'PILOT_RECONCILIATION_REGISTER.md', 'WINDOWS_RELEASE_AND_UPDATE.md', 'BACKUP_AND_RESTORE.md', 'RELEASE_CHECKLIST.md', 'PACKAGED_DESKTOP_SMOKE.md', 'README.md']
    .filter(copyIfExists);
  writeSmokeChecklistTemplate();

  const gitInfo = {
    branch: capture('git', ['branch', '--show-current'], { fallback: '' }),
    commit: capture('git', ['rev-parse', 'HEAD'], { fallback: '' }),
    status: capture('git', ['status', '--short'], { fallback: '' }),
  };

  writeManifest({ commandResults, artifactFiles, copiedDocs, gitInfo });

  console.log(`\nRelease bundle created:\n${releaseRoot}`);
}

main();
