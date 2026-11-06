import type { AppSettings } from '../utils/appSettings';
import { err, ok, type Result } from './geminiTypes';

export type LocalAiStatus = {
  cliAvailable: boolean;
  cliPath?: string | null;
  serverAvailable: boolean;
  endpoint: string;
  loadedModels: string[];
  configuredModelLoaded: boolean;
  modelDirectoryExists: boolean;
  modelDirectory: string;
  gpuDetected: boolean;
  gpuSummary?: string | null;
  message: string;
};

export type LocalAiCommandResult = {
  ok: boolean;
  message: string;
  output?: string | null;
};

type LocalAiRequest = {
  endpoint?: string;
  model?: string;
  modelDirectory?: string;
};

function requestFromSettings(settings: AppSettings['ai']): LocalAiRequest {
  return {
    endpoint: settings.localEndpoint,
    model: settings.localModel,
    modelDirectory: settings.localModelDirectory,
  };
}

async function invokeTauri<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
  if (!tauri) throw new Error('Desktop local AI commands are only available in the packaged app.');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export async function getLocalAiStatus(settings: AppSettings['ai']): Promise<LocalAiStatus> {
  return invokeTauri<LocalAiStatus>('local_ai_status', { request: requestFromSettings(settings) });
}

export async function createLocalAiModelDirectory(settings: AppSettings['ai']): Promise<LocalAiCommandResult> {
  return invokeTauri<LocalAiCommandResult>('local_ai_create_model_dir', { modelDirectory: settings.localModelDirectory });
}

export async function startLocalAiServer(): Promise<LocalAiCommandResult> {
  return invokeTauri<LocalAiCommandResult>('local_ai_start_server');
}

export async function loadLocalAiModel(model: string): Promise<LocalAiCommandResult> {
  return invokeTauri<LocalAiCommandResult>('local_ai_load_model', { model });
}

export async function testLocalAiCompletion(settings: AppSettings['ai']): Promise<LocalAiCommandResult> {
  return invokeTauri<LocalAiCommandResult>('local_ai_test_completion', { request: requestFromSettings(settings) });
}

export async function generateLocalChatCompletion(prompt: string, settings: AppSettings['ai']): Promise<Result<string>> {
  try {
    const text = await invokeTauri<string>('local_ai_chat_completion', {
      request: requestFromSettings(settings),
      prompt,
    });
    return ok(text);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Local AI generation failed.');
  }
}

export async function isLocalAiReady(settings: AppSettings['ai']): Promise<boolean> {
  try {
    const status = await getLocalAiStatus(settings);
    return status.serverAvailable && status.configuredModelLoaded;
  } catch {
    return false;
  }
}
