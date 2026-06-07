import {
  getAzureSpeechConfig,
  normalizeAzureSpeechRegion,
} from '@/lib/azure/speech-config';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildAzureSpeechSsml(text: string, voice: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('語音文字不可為空');
  }
  return `<speak version="1.0" xml:lang="en-US"><voice name="${voice}">${escapeXml(trimmed)}</voice></speak>`;
}

/** 使用 Azure Neural TTS REST API 合成 MP3 */
export async function synthesizeAzureSpeechMp3(text: string): Promise<ArrayBuffer> {
  const config = getAzureSpeechConfig();
  if (!config) {
    const rawRegion = process.env.AZURE_SPEECH_REGION?.trim();
    if (rawRegion) {
      try {
        normalizeAzureSpeechRegion(rawRegion);
      } catch (e) {
        throw e instanceof Error ? e : new Error('AZURE_SPEECH_REGION 格式錯誤');
      }
    }
    throw new Error(
      '未設定 Azure Speech：請在環境變數加入 AZURE_SPEECH_KEY 與 AZURE_SPEECH_REGION',
    );
  }

  const ssml = buildAzureSpeechSsml(text, config.voice);
  const endpoint = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': config.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to parse URL') || msg.includes('Invalid URL')) {
      throw new Error(
        `Azure 區域設定錯誤（目前：${process.env.AZURE_SPEECH_REGION ?? ''}）。請將 AZURE_SPEECH_REGION 改為區域代碼，例如 eastasia（勿用 East Asia）。`,
      );
    }
    throw e;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new Error(
        'Azure Speech 金鑰無效（401）。請到 Azure Portal → Speech 資源 →「金鑰與端點」確認 AZURE_SPEECH_KEY 與 AZURE_SPEECH_REGION 是否正確，並重啟 dev server。',
      );
    }
    throw new Error(
      `Azure Speech 合成失敗（HTTP ${res.status}）${detail ? `：${detail.slice(0, 200)}` : ''}`,
    );
  }

  return res.arrayBuffer();
}
