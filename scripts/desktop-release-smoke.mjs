#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const tauriRoot = path.join(repoRoot, 'src-tauri');
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const tauriConfig = JSON.parse(readFileSync(path.join(tauriRoot, 'tauri.conf.json'), 'utf8'));
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const cargoCommand = isWindows ? 'cargo.exe' : 'cargo';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactRoot = path.join(repoRoot, 'artifacts', 'desktop-release-smoke', timestamp);
const bundleRoot = path.join(tauriRoot, 'target', 'release', 'bundle');
const releaseExe = path.join(tauriRoot, 'target', 'release', isWindows ? 'app.exe' : 'app');
const args = new Set(process.argv.slice(2));

const skipTauriBuild = args.has('--skip-tauri-build');
const skipAudit = args.has('--skip-audit');
const skipBrowserSmoke = args.has('--skip-browser-smoke');
const skipCargoTest = args.has('--skip-cargo-test');
const strictAudit = args.has('--strict-audit');

const productName = tauriConfig.productName || packageJson.name || 'HZL QS Suite';
const identifier = tauriConfig.identifier || 'com.qspro.boq-generator';
const version = tauriConfig.version || packageJson.version || 'unknown';
const windowsRoamingAppData = process.env.APPDATA
  ? path.join(process.env.APPDATA, identifier)
  : path.join(os.homedir(), 'AppData', 'Roaming', identifier);
const windowsLocalAppData = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, identifier)
  : path.join(os.homedir(), 'AppData', 'Local', identifier);

const manualChecklist = [
  {
    group: 'Installer',
    items: [
      'Install the generated MSI/NSIS artifact on a clean Windows test profile or disposable VM.',
      'Launch HZL QS Suite from the Start menu and confirm the first window is usable at 1180x720 or larger.',
      'Confirm title bar, rail, Settings, and Diagnostics render without browser fallback warnings.',
    ],
  },
  {
    group: 'SQLite And Restart',
    items: [
      'Open Settings > General > Diagnostics and confirm storage reports Desktop SQLite.',
      'Create a project, open the bill workspace, toggle sticky bill totals off in Settings, apply defaults to the current project, then close the app.',
      'Reopen the packaged app and confirm the project, bill, Settings state, and sticky totals state survived restart.',
    ],
  },
  {
    group: 'Backup And Restore',
    items: [
      `Close the app and copy ${windowsRoamingAppData} to a dated backup folder outside the repo.`,
      'Confirm the backup contains qs-pro.db.',
      'On a disposable test profile only, rename the live app-data folder, restore the backup folder, reopen the app, and verify the smoke project and library are present.',
      'Open Diagnostics and copy the release smoke checklist report after restore.',
    ],
  },
  {
    group: 'Native Dialogs And Exports',
    items: [
      'Export the active project JSON and import it back into a clean profile.',
      'Export bill PDF and bill Excel from the packaged app, then open both files.',
      'Export a small .qsplib library pack and import it back into a clean profile.',
      'Open Tender, export a blank tender workbook and tender analysis workbook.',
    ],
  },
  {
    group: 'AI Config',
    items: [
      'Import a private AI config JSON in Settings > General, confirm Diagnostics reports AI configured, then remove it.',
      'Restart the app and confirm removed AI config does not return.',
    ],
  },
  {
    group: 'Release Decision',
    items: [
      'Confirm npm audit is clean or the desktop smoke report records an accepted exception.',
      'Attach this report, installer path, backup verification notes, and known limitations to the pilot release record.',
    ],
  },
];

function ensureArtifactRoot() {
  mkdirSync(artifactRoot, { recursive: true });
}

function commandText(command, commandArgs) {
  return [command, ...commandArgs].join(' ');
}

function runStep({ id, label, command, commandArgs, cwd = repoRoot, allowFailure = false }) {
  const startedAt = Date.now();
  const text = commandText(command, commandArgs);
  console.log(`\n> ${label}`);
  console.log(`  ${text}`);
  const isCmdShim = isWindows && command.toLowerCase().endsWith('.cmd');
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    shell: isCmdShim,
    maxBuffer: 1024 * 1024 * 32,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const statusCode = result.status ?? (result.error ? 1 : 0);
  const passed = statusCode === 0 && !result.error;
  const status = passed ? 'passed' : allowFailure ? 'issue' : 'failed';
  return {
    id,
    label,
    command: text,
    cwd,
    status,
    exitCode: statusCode,
    durationMs: Date.now() - startedAt,
    output: `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`.trim(),
  };
}

function capture(command, commandArgs, cwd = repoRoot) {
  const isCmdShim = isWindows && command.toLowerCase().endsWith('.cmd');
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    shell: isCmdShim,
    maxBuffer: 1024 * 1024 * 8,
  });
  if (result.status !== 0 || result.error) return '';
  return (result.stdout || '').trim();
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

function collectInstallerArtifacts() {
  const installerExtensions = /\.(msi|exe|appx|appimage|deb|rpm|dmg|pkg|zip|tar\.gz|gz|sig|json)$/i;
  const files = listFilesRecursive(bundleRoot)
    .filter((file) => installerExtensions.test(file))
    .map((file) => ({
      path: file,
      relative: path.relative(repoRoot, file),
      size: statSync(file).size,
      modifiedAt: statSync(file).mtime.toISOString(),
    }));

  if (existsSync(releaseExe)) {
    files.push({
      path: releaseExe,
      relative: path.relative(repoRoot, releaseExe),
      size: statSync(releaseExe).size,
      modifiedAt: statSync(releaseExe).mtime.toISOString(),
    });
  }

  return files.sort((a, b) => a.relative.localeCompare(b.relative));
}

function getReleaseIssueNotes(steps) {
  const notes = [];
  const auditStep = steps.find((step) => step.id === 'npm-audit');
  if (auditStep && auditStep.status !== 'passed') {
    const output = auditStep.output || '';
    if (/unable to verify the first certificate|certificate/i.test(output)) {
      notes.push(
        'npm audit was blocked by local registry certificate verification. Re-run `npm audit --audit-level=moderate` from a trusted npm/Windows certificate environment, or record a named accepted exception before pilot release.'
      );
    } else {
      notes.push('npm audit did not pass. Review the audit output and resolve or record accepted exceptions before pilot release.');
    }
  }

  return notes;
}

function writeManualChecklist() {
  const lines = [
    `# ${productName} Packaged Desktop Smoke Checklist`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Product: ${productName}`,
    `Version: ${version}`,
    `Identifier: ${identifier}`,
    '',
    'Use this checklist against the packaged installer, not the browser dev server.',
    '',
  ];

  for (const section of manualChecklist) {
    lines.push(`## ${section.group}`, '');
    section.items.forEach((item) => lines.push(`- [ ] ${item}`));
    lines.push('');
  }

  writeFileSync(path.join(artifactRoot, 'PACKAGED_DESKTOP_SMOKE_CHECKLIST.md'), lines.join('\n'), 'utf8');
}

function writeReport({ steps, artifacts }) {
  const failed = steps.filter((step) => step.status === 'failed');
  const issues = steps.filter((step) => step.status === 'issue');
  const releaseIssueNotes = getReleaseIssueNotes(steps);
  const lines = [
    `# ${productName} Desktop Release Smoke Report`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Product: ${productName}`,
    `Version: ${version}`,
    `Identifier: ${identifier}`,
    `Repo: ${repoRoot}`,
    `Branch: ${capture('git', ['branch', '--show-current']) || 'unknown'}`,
    `Commit: ${capture('git', ['rev-parse', 'HEAD']) || 'unknown'}`,
    '',
    '## Environment',
    '',
    `- OS: ${os.type()} ${os.release()} ${os.arch()}`,
    `- Node: ${capture(process.execPath, ['--version']) || 'unknown'}`,
    `- npm: ${capture(npmCommand, ['--version']) || 'unknown'}`,
    `- rustc: ${capture('rustc', ['--version']) || 'unknown'}`,
    `- cargo: ${capture(cargoCommand, ['--version']) || 'unknown'}`,
    '',
    '## Automated Gate',
    '',
    ...steps.map((step) => `- [${step.status === 'passed' ? 'PASS' : step.status === 'issue' ? 'ISSUE' : 'FAIL'}] ${step.label} (${Math.round(step.durationMs / 1000)}s)`),
    '',
    '## Installer Artifacts',
    '',
  ];

  if (artifacts.length === 0) {
    lines.push('- No installer or release executable artifacts were found.');
  } else {
    artifacts.forEach((artifact) => {
      lines.push(`- ${artifact.relative} (${formatBytes(artifact.size)}, modified ${artifact.modifiedAt})`);
    });
  }

  lines.push(
    '',
    '## App Data Paths To Verify',
    '',
    `- Roaming data: ${windowsRoamingAppData}`,
    `- Local data: ${windowsLocalAppData}`,
    `- Expected SQLite database: ${path.join(windowsRoamingAppData, 'qs-pro.db')}`,
    '',
    '## Manual Checklist',
    '',
    'Complete `PACKAGED_DESKTOP_SMOKE_CHECKLIST.md` in this artifact folder before approving a pilot installer.',
    '',
    '## Gate Result',
    '',
  );

  if (failed.length > 0) {
    lines.push(`BLOCKED: ${failed.length} automated step${failed.length === 1 ? '' : 's'} failed.`);
  } else if (issues.length > 0) {
    lines.push(`CONDITIONAL: automated build passed, but ${issues.length} issue${issues.length === 1 ? '' : 's'} must be resolved or accepted before release.`);
  } else {
    lines.push('AUTOMATED PASS: complete the manual packaged checklist before release approval.');
  }

  if (releaseIssueNotes.length > 0) {
    lines.push('', '## Release Issues To Resolve', '');
    releaseIssueNotes.forEach((note) => lines.push(`- ${note}`));
  }

  lines.push('', '## Command Output Summary', '');
  steps.forEach((step) => {
    lines.push(`### ${step.label}`, '');
    lines.push(`- Status: ${step.status}`);
    lines.push(`- Command: \`${step.command}\``);
    lines.push(`- CWD: \`${step.cwd}\``);
    if (step.output) {
      const excerpt = step.output.length > 6000 ? `${step.output.slice(-6000)}\n[output truncated to last 6000 characters]` : step.output;
      lines.push('', '```text', excerpt, '```');
    }
    lines.push('');
  });

  writeFileSync(path.join(artifactRoot, 'DESKTOP_RELEASE_SMOKE_REPORT.md'), lines.join('\n'), 'utf8');
}

function main() {
  ensureArtifactRoot();
  const steps = [];
  let criticalFailed = false;

  const runCritical = (step) => {
    if (criticalFailed) return;
    const result = runStep(step);
    steps.push(result);
    if (result.status === 'failed') criticalFailed = true;
  };

  runCritical({ id: 'lint', label: 'TypeScript lint', command: npmCommand, commandArgs: ['run', 'lint'] });
  runCritical({ id: 'unit', label: 'Unit and integration tests', command: npmCommand, commandArgs: ['test', '--', '--run'] });

  if (!skipBrowserSmoke) {
    runCritical({ id: 'browser-smoke', label: 'Production browser smoke matrix', command: npmCommand, commandArgs: ['run', 'smoke:browser:preview'] });
  }

  runCritical({ id: 'cargo-check', label: 'Rust cargo check', command: cargoCommand, commandArgs: ['check'], cwd: tauriRoot });

  if (!skipCargoTest) {
    runCritical({ id: 'cargo-test', label: 'Rust native tests', command: cargoCommand, commandArgs: ['test'], cwd: tauriRoot });
  }

  if (!skipTauriBuild) {
    runCritical({ id: 'tauri-build', label: 'Packaged Tauri build', command: npmCommand, commandArgs: ['run', 'tauri', '--', 'build'] });
  }

  if (!skipAudit) {
    const audit = runStep({
      id: 'npm-audit',
      label: strictAudit ? 'npm audit' : 'npm audit (recorded, non-blocking)',
      command: npmCommand,
      commandArgs: ['audit', '--audit-level=moderate'],
      allowFailure: !strictAudit,
    });
    steps.push(audit);
    if (audit.status === 'failed') criticalFailed = true;
  }

  const artifacts = collectInstallerArtifacts();
  if (!skipTauriBuild && artifacts.length === 0) {
    steps.push({
      id: 'installer-artifacts',
      label: 'Installer artifact discovery',
      command: 'collect Tauri bundle output',
      cwd: repoRoot,
      status: 'failed',
      exitCode: 1,
      durationMs: 0,
      output: `No installer artifacts were found under ${bundleRoot}.`,
    });
    criticalFailed = true;
  }

  writeManualChecklist();
  writeReport({ steps, artifacts });

  console.log(`\nDesktop release smoke artifact folder:\n${artifactRoot}`);
  console.log(`Report:\n${path.join(artifactRoot, 'DESKTOP_RELEASE_SMOKE_REPORT.md')}`);
  console.log(`Manual checklist:\n${path.join(artifactRoot, 'PACKAGED_DESKTOP_SMOKE_CHECKLIST.md')}`);

  if (criticalFailed) {
    process.exitCode = 1;
  }
}

main();
