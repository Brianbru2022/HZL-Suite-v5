import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const tag = `v${packageJson.version}`;

function capture(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

const status = capture(['status', '--short']);
if (status) throw new Error(`Release source cannot be frozen while the worktree is dirty. Commit the reviewed source first.\n\n${status}`);
const head = capture(['rev-parse', 'HEAD']);
const existing = capture(['tag', '--list', tag]);
if (existing) {
  const tagged = capture(['rev-list', '-n', '1', tag]);
  if (tagged !== head) throw new Error(`${tag} already exists on ${tagged}; it cannot be moved automatically.`);
  console.log(`${tag} already freezes ${head}.`);
} else {
  execFileSync('git', ['tag', '-a', tag, '-m', `HZL QS Suite ${packageJson.version} release source freeze`], { cwd: root, stdio: 'inherit' });
  console.log(`Created ${tag} at ${head}.`);
}
