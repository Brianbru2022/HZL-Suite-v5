#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const headed = args.has('--headed');
const usePreview = args.has('--preview');
const keepBrowser = args.has('--keep-browser');
const basePort = Number(process.env.SMOKE_PORT || 4187);
const appUrl = `http://127.0.0.1:${basePort}`;
const artifactRoot = path.join(rootDir, 'artifacts', 'browser-smoke', new Date().toISOString().replace(/[:.]/g, '-'));

const viewports = [
  { name: '1180x720', width: 1180, height: 720 },
  { name: '1440x820', width: 1440, height: 820 },
  { name: '1920x1080', width: 1920, height: 1080 },
];
const themes = ['light', 'dark'];

const storageKeys = {
  projects: 'qs-pro-projects-v11',
  libraries: 'qs-pro-libraries-v11',
  trades: 'qs-pro-trades-v11',
  appraisals: 'qs-pro-appraisals-v1',
  appraisalHouseTypes: 'qs-pro-appraisal-house-types-v1',
  appraisalRates: 'qs-pro-appraisal-rates-v1',
  appSettings: 'qs-pro-app-settings-v1',
  theme: 'qs-pro-theme',
  spellcheck: 'qspro.spellcheckPreference',
};

const smokeProject = {
  id: 'smoke-project',
  name: 'Smoke Test Project',
  client: 'Smoke Client',
  location: 'Smoke Site',
  reference: 'SMOKE-001',
  updatedAt: '2026-06-22T12:00:00.000Z',
  measurementStandard: 'SMM7',
  ohpPercentage: 10,
  billWorkspaceLayout: 'FULL_BILL',
  billWorkspaceMode: 'CLEAN',
  renumberNumericBillsOnReorder: true,
  showWorkflowGuidance: false,
  showStickyBillTotals: true,
  autoSnapshotsEnabled: true,
  headingDisplayStyle: 'BOLD',
  commentDisplayStyle: 'MUTED_ITALIC',
  tenderContractors: {
    'trade-groundworks': ['contractor-alpha', 'contractor-beta'],
  },
  bills: [
    {
      id: 'smoke-bill',
      name: 'Main bill',
      sections: [
        {
          id: 'smoke-section',
          name: 'External works',
          items: [
            { id: 'smoke-heading', type: 'GENERAL_HEADING', reference: '', description: 'External works', unit: '', quantity: 0, rate: 0, total: 0 },
            { id: 'smoke-item-1', type: 'PRICED', reference: 'A-01-01-01', description: 'Excavate reduced levels', unit: 'm3', quantity: 42, rate: 18, total: 756, tradePackageId: 'trade-groundworks' },
            { id: 'smoke-item-2', type: 'PRICED', reference: 'A-01-01-02', description: 'Imported granular fill', unit: 'm3', quantity: 16, rate: 45, total: 720, tradePackageId: 'trade-groundworks' },
            { id: 'smoke-ps', type: 'PROVISIONAL_SUM', reference: 'A-01-01-03', description: 'Testing and attendance allowance', unit: 'sum', quantity: 1, rate: 350, total: 350 },
          ],
        },
      ],
    },
  ],
};

const smokeLibrary = {
  id: 'smoke-library',
  name: 'Smoke Standards Library',
  permissions: {
    allowExportAll: true,
    allowExportFolders: true,
    allowExportSections: true,
    allowLibraryEditing: true,
  },
  folders: [
    {
      id: 'smoke-folder',
      orderRef: 'A',
      name: 'Groundworks',
      sections: [
        {
          id: 'smoke-library-section',
          orderRef: 'A10',
          name: 'Excavation',
          items: [
            { type: 'GENERAL_HEADING', reference: '', description: 'Groundworks', unit: '', rate: 0 },
            { type: 'PRICED', reference: 'A10.001', description: 'Excavate trenches', unit: 'm', rate: 22 },
          ],
          itemCount: 2,
          pricedCount: 1,
        },
      ],
      itemCount: 2,
      pricedCount: 1,
      sectionCount: 1,
    },
  ],
  itemCount: 2,
  pricedCount: 1,
  sectionCount: 1,
  folderCount: 1,
};

const smokeTrades = [
  {
    id: 'trade-groundworks',
    name: 'Groundworks',
    contractors: [
      {
        id: 'contractor-alpha',
        name: 'Alpha Groundworks',
        address: '1 Smoke Street',
        email: 'alpha@example.test',
        phone: '01000 000001',
        rating: 'GREEN',
      },
      {
        id: 'contractor-beta',
        name: 'Beta Civils',
        address: '2 Smoke Street',
        email: 'beta@example.test',
        phone: '01000 000002',
        rating: 'YELLOW',
      },
    ],
  },
];

const appSettings = {
  version: 1,
  general: {
    hardeningMode: true,
    defaultSection: 'general',
  },
  projectDefaults: {
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    billWorkspaceLayout: 'FULL_BILL',
    billWorkspaceMode: 'CLEAN',
    renumberNumericBillsOnReorder: true,
    showWorkflowGuidance: false,
    showStickyBillTotals: true,
    autoSnapshotsEnabled: true,
    headingDisplayStyle: 'BOLD',
    commentDisplayStyle: 'MUTED_ITALIC',
    billLineStyles: {},
  },
  moduleSettings: {
    estimating: { showBillSettingsShortcut: true },
    library: { preferQsplibPacks: true },
    tender: { showWorkflowStageCards: true },
    reports: { showBetaReports: true },
    audits: { showLocalAuditTrail: true },
    appraisals: {
      defaultTemplate: 'RESIDENTIAL_SALES',
      defaultDurationMonths: 18,
      defaultTargetProfitOnGdvPercent: 20,
      defaultFinanceAnnualRatePercent: 0,
    },
  },
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(label, fn, timeoutMs = 15000, intervalMs = 100) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }
  const suffix = lastError instanceof Error ? ` Last error: ${lastError.message}` : '';
  throw new Error(`${label} timed out after ${timeoutMs}ms.${suffix}`);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('Unable to reserve a debugging port.'));
      });
    });
  });
}

async function waitForHttp(url, label) {
  await waitUntil(label, async () => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }, 45000, 250);
}

function startServer() {
  const script = usePreview ? 'preview' : 'dev';
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run ${script} -- --host 127.0.0.1 --port ${basePort} --strictPort`]
    : ['run', script, '--', '--host', '127.0.0.1', '--port', String(basePort), '--strictPort'];
  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  child.on('exit', (code) => {
    if (child.__smokeIntentionalKill) return;
    if (code !== null && code !== 0) {
      log(`Smoke server exited with code ${code}.\n${output}`);
    }
  });
  return child;
}

function browserCandidates() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    process.env.SMOKE_BROWSER_PATH,
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localAppData ? path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ];
  return candidates.filter(Boolean);
}

async function findBrowserPath() {
  for (const candidate of browserCandidates()) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Try the next known browser location.
    }
  }
  throw new Error('No Chrome or Edge executable was found. Set SMOKE_BROWSER_PATH to a Chromium-based browser.');
}

function startBrowser(browserPath, debugPort, profileDir) {
  const launchArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-background-networking',
    '--window-size=1440,820',
    headed ? '' : '--headless=new',
    'about:blank',
  ].filter(Boolean);

  return spawn(browserPath, launchArgs, {
    stdio: ['ignore', 'ignore', 'ignore'],
    windowsHide: true,
  });
}

async function killProcessTree(child) {
  if (!child || child.killed || !child.pid) return;
  child.__smokeIntentionalKill = true;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
    return;
  }
  child.kill('SIGTERM');
}

class CdpConnection {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    if (typeof WebSocket === 'undefined') {
      throw new Error('This Node runtime does not expose WebSocket. Use Node 22+ or install a browser runner dependency.');
    }

    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener('message', (event) => this.handleMessage(event.data));
    this.ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('Browser debugging connection closed.'));
      this.pending.clear();
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Browser debugging WebSocket did not open.')), 10000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.ws.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Browser debugging WebSocket failed to open.'));
      }, { once: true });
    });
  }

  handleMessage(raw) {
    const data = typeof raw === 'string' ? raw : raw.toString();
    const message = JSON.parse(data);
    if (!message.id) {
      if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled' || message.method === 'Log.entryAdded') {
        this.events.push(message);
        if (this.events.length > 200) this.events.shift();
      }
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
      return;
    }
    pending.resolve(message.result || {});
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();
  }

  getEvents(sessionId) {
    return this.events.filter((event) => !sessionId || event.sessionId === sessionId);
  }
}

class SmokeTab {
  constructor(cdp, targetId, sessionId) {
    this.cdp = cdp;
    this.targetId = targetId;
    this.sessionId = sessionId;
  }

  send(method, params = {}) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async init(viewport, theme) {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await this.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    });
    await this.send('Page.addScriptToEvaluateOnNewDocument', {
      source: buildSeedScript(theme),
    });
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await waitUntil('document ready', async () => {
      const state = await this.evaluate('document.readyState');
      return state === 'interactive' || state === 'complete';
    }, 30000, 100);
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      const details = response.exceptionDetails.text || response.exceptionDetails.exception?.description || 'Evaluation failed.';
      throw new Error(details);
    }
    return response.result?.value;
  }

  async isSmokeVisible(id) {
    return this.evaluate(`
      (() => {
        const el = document.querySelector('[data-smoke="${id}"]');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })()
    `);
  }

  async waitForSmoke(id, timeoutMs = 45000) {
    await waitUntil(`data-smoke="${id}"`, () => this.isSmokeVisible(id), timeoutMs, 100);
  }

  async waitForNoSmoke(id, timeoutMs = 5000) {
    await waitUntil(`data-smoke="${id}" to disappear`, async () => !(await this.isSmokeVisible(id)), timeoutMs, 100);
  }

  async clickSmoke(id) {
    const clicked = await this.evaluate(`
      (() => {
        const el = document.querySelector('[data-smoke="${id}"]');
        if (!el) return false;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return true;
      })()
    `);
    if (!clicked) throw new Error(`Unable to click data-smoke="${id}".`);
  }

  async contextMenuSmoke(id) {
    const opened = await this.evaluate(`
      (() => {
        const el = document.querySelector('[data-smoke="${id}"]');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: Math.round(rect.left + Math.min(120, rect.width / 2)),
          clientY: Math.round(rect.top + Math.min(120, rect.height / 2)),
          button: 2,
        });
        el.dispatchEvent(event);
        return true;
      })()
    `);
    if (!opened) throw new Error(`Unable to dispatch context menu for data-smoke="${id}".`);
  }

  async getSmokeRect(id) {
    return this.evaluate(`
      (() => {
        const el = document.querySelector('[data-smoke="${id}"]');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      })()
    `);
  }

  async dragSmoke(id, dx, dy) {
    const rect = await this.getSmokeRect(id);
    if (!rect) throw new Error(`Unable to find draggable data-smoke="${id}".`);
    const x = Math.round(rect.left + Math.min(rect.width - 8, 80));
    const y = Math.round(rect.top + Math.min(rect.height - 8, 18));
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + dx, y: y + dy, button: 'left', buttons: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y: y + dy, button: 'left', buttons: 0, clickCount: 1 });
    await wait(250);
    const nextRect = await this.getSmokeRect(id);
    if (!nextRect || Math.abs(nextRect.left - rect.left) < 8 || Math.abs(nextRect.top - rect.top) < 8) {
      throw new Error('Sticky bill totals did not move after drag.');
    }
  }

  async press(key) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key });
  }

  async hasScrollableWithinSmoke(id) {
    return this.evaluate(`
      (() => {
        const root = document.querySelector('[data-smoke="${id}"]');
        if (!root) return false;
        const nodes = [root, ...root.querySelectorAll('*')];
        return nodes.some((node) => {
          const style = getComputedStyle(node);
          const overflowY = style.overflowY;
          return (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 16;
        });
      })()
    `);
  }

  async assertDarkMode(theme) {
    const isDark = await this.evaluate("document.documentElement.classList.contains('dark')");
    if (theme === 'dark' && !isDark) throw new Error('Expected dark theme class on document root.');
    if (theme === 'light' && isDark) throw new Error('Expected light theme without dark class on document root.');
  }

  async assertNoConsoleCrashes() {
    const errors = await this.evaluate('window.__SMOKE_ERRORS || []');
    const fatal = errors.filter((entry) => !String(entry).includes('SQLite'));
    if (fatal.length > 0) throw new Error(`Browser errors detected: ${fatal.slice(0, 3).join(' | ')}`);
  }

  async visibleText() {
    return this.evaluate('document.body ? document.body.innerText.slice(0, 2000) : ""');
  }

  async debugDocument() {
    return this.evaluate(`({
      url: location.href,
      title: document.title,
      html: document.documentElement ? document.documentElement.outerHTML.slice(0, 2000) : '',
      resources: performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        duration: Math.round(entry.duration)
      })).slice(-20)
    })`);
  }

  debugEvents() {
    return this.cdp.getEvents(this.sessionId).map((event) => {
      if (event.method === 'Runtime.exceptionThrown') {
        return event.params?.exceptionDetails?.exception?.description
          || event.params?.exceptionDetails?.text
          || 'Runtime exception';
      }
      if (event.method === 'Runtime.consoleAPICalled') {
        const args = event.params?.args || [];
        const values = args.map((arg) => arg.value || arg.description || arg.type).filter(Boolean);
        return `${event.params?.type || 'console'}: ${values.join(' ')}`;
      }
      if (event.method === 'Log.entryAdded') {
        const entry = event.params?.entry;
        return `${entry?.level || 'log'}: ${entry?.text || ''}`;
      }
      return event.method;
    });
  }

  async screenshot(filePath) {
    const response = await this.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 78,
      captureBeyondViewport: false,
    });
    await fs.writeFile(filePath, response.data, 'base64');
  }

  async close() {
    await this.cdp.send('Target.closeTarget', { targetId: this.targetId });
  }
}

function buildSeedScript(theme) {
  return `
    (() => {
      window.__SMOKE_ERRORS = [];
      window.addEventListener('error', (event) => {
        window.__SMOKE_ERRORS.push(event.message || 'window error');
      });
      window.addEventListener('unhandledrejection', (event) => {
        window.__SMOKE_ERRORS.push(String(event.reason && (event.reason.message || event.reason)) || 'unhandled rejection');
      });
      try {
        localStorage.clear();
        localStorage.setItem(${JSON.stringify(storageKeys.theme)}, ${JSON.stringify(theme)});
        localStorage.setItem(${JSON.stringify(storageKeys.projects)}, JSON.stringify(${JSON.stringify([smokeProject])}));
        localStorage.setItem(${JSON.stringify(storageKeys.libraries)}, JSON.stringify(${JSON.stringify([smokeLibrary])}));
        localStorage.setItem(${JSON.stringify(storageKeys.trades)}, JSON.stringify(${JSON.stringify(smokeTrades)}));
        localStorage.setItem(${JSON.stringify(storageKeys.appraisals)}, JSON.stringify([]));
        localStorage.setItem(${JSON.stringify(storageKeys.appraisalHouseTypes)}, JSON.stringify([]));
        localStorage.setItem(${JSON.stringify(storageKeys.appraisalRates)}, JSON.stringify([]));
        localStorage.setItem(${JSON.stringify(storageKeys.appSettings)}, JSON.stringify(${JSON.stringify(appSettings)}));
        localStorage.setItem(${JSON.stringify(storageKeys.spellcheck)}, JSON.stringify({ enabled: true, language: 'en-GB' }));
      } catch (error) {
        window.__SMOKE_ERRORS.push(error instanceof Error ? error.message : String(error));
      }
    })();
  `;
}

async function connectToBrowser(debugPort) {
  const version = await waitUntil('browser debugging endpoint', async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (!response.ok) return null;
      const payload = await response.json();
      return payload.webSocketDebuggerUrl ? payload : null;
    } catch {
      return null;
    }
  }, 20000, 200);

  const cdp = new CdpConnection(version.webSocketDebuggerUrl);
  await cdp.connect();
  return cdp;
}

async function newTab(cdp, viewport, theme) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const tab = new SmokeTab(cdp, targetId, sessionId);
  await tab.init(viewport, theme);
  return tab;
}

async function capture(tab, viewport, theme, name) {
  const filename = `${viewport.name}-${theme}-${name}.jpg`.replace(/[^\w.-]+/g, '-');
  await tab.screenshot(path.join(artifactRoot, filename));
}

async function runHomeScenario(cdp, viewport, theme) {
  const tab = await newTab(cdp, viewport, theme);
  try {
    await tab.goto(appUrl);
    await tab.assertDarkMode(theme);
    await tab.waitForSmoke('home-workspace');
    await capture(tab, viewport, theme, 'home');

    await tab.clickSmoke('rail-appraisals');
    await tab.waitForSmoke('appraisals-workspace');
    await tab.clickSmoke('appraisals-new-house');
    await tab.waitForSmoke('appraisals-new-setup-drawer');
    await capture(tab, viewport, theme, 'appraisals-new-house');
    await tab.clickSmoke('appraisals-new-cancel');
    await tab.waitForNoSmoke('appraisals-new-setup-drawer');
    await capture(tab, viewport, theme, 'appraisals-home');

    await tab.clickSmoke('rail-settings');
    await tab.waitForSmoke('settings-workspace');
    await tab.waitForNoSmoke('appraisals-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'settings-home');

    await tab.clickSmoke('rail-roadmap');
    await tab.waitForSmoke('roadmap-workspace');
    if (!(await tab.hasScrollableWithinSmoke('roadmap-workspace'))) {
      throw new Error('Roadmap workspace did not expose a scrollable content area.');
    }
    await capture(tab, viewport, theme, 'roadmap');
    await tab.assertNoConsoleCrashes();
  } catch (error) {
    await capture(tab, viewport, theme, 'home-failure').catch(() => {});
    const text = await tab.visibleText().catch(() => '');
    const documentInfo = await tab.debugDocument().catch(() => null);
    const events = tab.debugEvents().slice(-10);
    throw new Error(`${error instanceof Error ? error.message : String(error)}${documentInfo ? `\nURL: ${documentInfo.url}\nTitle: ${documentInfo.title}\nHTML:\n${documentInfo.html}\nResources:\n${JSON.stringify(documentInfo.resources, null, 2)}` : ''}${text ? `\nVisible text:\n${text}` : ''}${events.length ? `\nBrowser events:\n${events.join('\n')}` : ''}`);
  } finally {
    await tab.close().catch(() => {});
  }
}

async function runProjectScenario(cdp, viewport, theme) {
  const tab = await newTab(cdp, viewport, theme);
  try {
    await tab.goto(appUrl);
    await tab.waitForSmoke('home-workspace');
    await tab.waitForSmoke('open-active-project');
    await tab.clickSmoke('open-active-project');
    await tab.waitForSmoke('bill-workspace');
    await tab.waitForSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'bill');

    await tab.contextMenuSmoke('bill-workspace');
    await tab.waitForSmoke('context-menu');
    await capture(tab, viewport, theme, 'bill-context-menu');
    await tab.press('Escape');
    await tab.waitForNoSmoke('context-menu');

    await tab.dragSmoke('sticky-bill-totals', -120, -80);
    await capture(tab, viewport, theme, 'bill-sticky-dragged');

    await tab.clickSmoke('rail-appraisals');
    await tab.waitForSmoke('appraisals-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'appraisals-project');

    await tab.clickSmoke('rail-library');
    await waitUntil('desktop storage library notice', async () => (await tab.visibleText()).includes('Libraries require desktop storage'));
    await tab.waitForNoSmoke('appraisals-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'library-desktop-storage-required');

    await tab.clickSmoke('rail-settings');
    await tab.waitForSmoke('settings-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'settings-project');

    await tab.clickSmoke('settings-section-project-defaults');
    await tab.clickSmoke('settings-sticky-totals-toggle');
    await tab.clickSmoke('settings-save');
    await tab.clickSmoke('settings-section-current-project');
    await tab.clickSmoke('settings-apply-defaults-current-project');
    await tab.clickSmoke('rail-estimate');
    await tab.waitForSmoke('bill-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'bill-sticky-off');

    await tab.clickSmoke('rail-tender');
    await tab.waitForSmoke('tender-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'tender');

    await tab.clickSmoke('rail-reports');
    await tab.waitForSmoke('reports-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'reports');

    await tab.clickSmoke('rail-audits');
    await tab.waitForSmoke('audits-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    await capture(tab, viewport, theme, 'audits');

    await tab.clickSmoke('rail-roadmap');
    await tab.waitForSmoke('roadmap-workspace');
    await tab.waitForNoSmoke('sticky-bill-totals');
    if (!(await tab.hasScrollableWithinSmoke('roadmap-workspace'))) {
      throw new Error('Project roadmap workspace did not expose a scrollable content area.');
    }
    await capture(tab, viewport, theme, 'roadmap-project');
    await tab.assertNoConsoleCrashes();
  } catch (error) {
    await capture(tab, viewport, theme, 'project-failure').catch(() => {});
    const text = await tab.visibleText().catch(() => '');
    const documentInfo = await tab.debugDocument().catch(() => null);
    const events = tab.debugEvents().slice(-10);
    throw new Error(`${error instanceof Error ? error.message : String(error)}${documentInfo ? `\nURL: ${documentInfo.url}\nTitle: ${documentInfo.title}\nHTML:\n${documentInfo.html}\nResources:\n${JSON.stringify(documentInfo.resources, null, 2)}` : ''}${text ? `\nVisible text:\n${text}` : ''}${events.length ? `\nBrowser events:\n${events.join('\n')}` : ''}`);
  } finally {
    await tab.close().catch(() => {});
  }
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const server = startServer();
  let browser = null;
  let cdp = null;
  let profileDir = null;

  try {
    log(`Starting ${usePreview ? 'production preview' : 'Vite dev server'} at ${appUrl}...`);
    await waitForHttp(appUrl, 'app server');

    const browserPath = await findBrowserPath();
    const debugPort = await getFreePort();
    profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hzl-browser-smoke-'));
    browser = startBrowser(browserPath, debugPort, profileDir);
    cdp = await connectToBrowser(debugPort);

    for (const viewport of viewports) {
      for (const theme of themes) {
        const label = `${viewport.name} ${theme}`;
        log(`Running home smoke: ${label}`);
        await runHomeScenario(cdp, viewport, theme);
        log(`Running project smoke: ${label}`);
        await runProjectScenario(cdp, viewport, theme);
      }
    }

    log(`Browser smoke passed. Screenshots: ${artifactRoot}`);
  } finally {
    if (cdp) cdp.close();
    if (browser && !keepBrowser) await killProcessTree(browser);
    await killProcessTree(server);
    if (profileDir && !keepBrowser) await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(async (error) => {
  process.stderr.write(`Browser smoke failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write(`Screenshots and partial artifacts: ${artifactRoot}\n`);
  process.exitCode = 1;
});
