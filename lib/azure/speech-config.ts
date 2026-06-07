/** Azure Cognitive Services Speech（TTS）環境設定 */

export const DEFAULT_AZURE_SPEECH_VOICE = 'en-US-JennyNeural';

/**
 * Azure TTS 端點需使用區域「代碼」（如 eastasia、eastus），
 * 不可使用 Portal 顯示名稱（如 East Asia、East US）。
 */
export function normalizeAzureSpeechRegion(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const compact = lower.replace(/\s+/g, '');

  if (/^[a-z0-9-]{2,40}$/.test(compact)) {
    return compact;
  }

  throw new Error(
    `AZURE_SPEECH_REGION 無法解析：「${raw}」。請填區域代碼，例如 eastasia、eastus、westeurope（Azure Portal → Speech → 端點 中的區域代碼，不是「East Asia」這類顯示名稱）。`,
  );
}

export function getAzureSpeechConfig():
  | { key: string; region: string; voice: string }
  | null {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const regionRaw = process.env.AZURE_SPEECH_REGION?.trim();
  if (!key || !regionRaw) return null;

  let region: string;
  try {
    region = normalizeAzureSpeechRegion(regionRaw);
  } catch {
    return null;
  }

  const voice =
    process.env.AZURE_SPEECH_VOICE?.trim() || DEFAULT_AZURE_SPEECH_VOICE;

  return { key, region, voice };
}

export function isAzureSpeechConfigured(): boolean {
  return getAzureSpeechConfig() !== null;
}

/** 供 UI 顯示：目前設定的區域代碼（已正規化） */
export function getAzureSpeechRegionLabel(): string | null {
  const raw = process.env.AZURE_SPEECH_REGION?.trim();
  if (!raw) return null;
  try {
    return normalizeAzureSpeechRegion(raw);
  } catch {
    return null;
  }
}
