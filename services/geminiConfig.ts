/** Message shown when Gemini API key is missing. */
export const GEMINI_KEY_MESSAGE =
  'Gemini is not configured. Import an AI config JSON in Settings, or set GEMINI_API_KEY for local desktop development.';

export type GeminiConfigStatus = {
  configured: boolean;
  source: 'env' | 'imported' | 'none';
  provider: string | null;
  configPath: string | null;
};

async function getTauriInvoke() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

async function getTauriDialogOpen() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  return open;
}

async function getTauriReadTextFile() {
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  return readTextFile;
}

export async function getGeminiConfigStatus(): Promise<GeminiConfigStatus> {
  try {
    const invoke = await getTauriInvoke();
    return await invoke<GeminiConfigStatus>('get_gemini_config_status');
  } catch {
    return {
      configured: false,
      source: 'none',
      provider: null,
      configPath: null,
    };
  }
}

export async function isGeminiApiKeySet(): Promise<boolean> {
  const status = await getGeminiConfigStatus();
  return status.configured;
}

export async function importGeminiConfigFromPath(path: string): Promise<GeminiConfigStatus> {
  const invoke = await getTauriInvoke();
  return await invoke<GeminiConfigStatus>('import_gemini_config', { path });
}

export async function importGeminiConfigFromJson(json: string): Promise<GeminiConfigStatus> {
  const invoke = await getTauriInvoke();
  return await invoke<GeminiConfigStatus>('import_gemini_config_json', { json });
}

export async function validateAndStoreGeminiConfig(config: {
  provider: string;
  apiKey: string;
  defaultModel?: string;
  analysisModel?: string;
  hierarchyModel?: string;
}): Promise<GeminiConfigStatus> {
  const invoke = await getTauriInvoke();
  return await invoke<GeminiConfigStatus>('validate_and_store_gemini_config_json', {
    json: JSON.stringify(config),
  });
}

export async function importGeminiConfigFromDialog(): Promise<GeminiConfigStatus | null> {
  const open = await getTauriDialogOpen();
  const selected = await open({
    multiple: false,
    filters: [{ name: 'JSON files', extensions: ['json'] }],
  });

  if (!selected || Array.isArray(selected)) return null;

  const readTextFile = await getTauriReadTextFile();
  const json = await readTextFile(selected);
  return importGeminiConfigFromJson(json);
}

export async function removeGeminiConfig(): Promise<GeminiConfigStatus> {
  const invoke = await getTauriInvoke();
  return await invoke<GeminiConfigStatus>('remove_gemini_config');
}
