import { expect, it } from 'vitest';
import packageJson from '../package.json';
import tauriConfig from '../src-tauri/tauri.conf.json';
import { APP_RELEASE_LABEL, APP_VERSION } from './appMetadata';

it('shows the same version as the application package and desktop configuration', () => {
  expect(APP_VERSION).toBe(packageJson.version);
  expect(APP_VERSION).toBe(tauriConfig.version);
  expect(APP_RELEASE_LABEL).toContain(`v${packageJson.version}`);
});
