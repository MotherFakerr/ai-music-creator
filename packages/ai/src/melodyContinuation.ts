/**
 * AI 续写服务 - 基于 Minimax API（支持流式）
 */

// PianoRoll 音符类型定义
export interface PianoRollNote {
  id: string;
  channelId: string;
  pitch: number;
  startStep: number;
  length: number;
  velocity: number;
}

export interface AIConfig {
  apiKey?: string;
  model?: string;
}

const STORAGE_KEY = "ai-music-minimax-key";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredApiKey(apiKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, apiKey);
}

if (typeof window !== "undefined") {
  (
    window as unknown as { setStoredApiKey: typeof setStoredApiKey }
  ).setStoredApiKey = setStoredApiKey;
  (
    window as unknown as { getStoredApiKey: typeof getStoredApiKey }
  ).getStoredApiKey = getStoredApiKey;
}

export interface ContinueOptions {
  notes: PianoRollNote[];
  stepsPerBar: number;
  prompt?: string;
  lengthInBars?: number;
  onChunk?: (text: string) => void;
}

interface AIMusicNote {
  pitch: number;
  start: number;
  length: number;
  velocity: number;
}

const DEFAULT_MODEL = "MiniMax-M2.5";

function buildPrompt(
  notes: PianoRollNote[],
  stepsPerBar: number,
  prompt?: string,
  lengthInBars = 8,
): string {
  const noteLines = notes
    .sort((a, b) => a.startStep - b.startStep)
    .map((n) => `${n.pitch}, ${n.startStep}, ${n.length}, ${n.velocity}`)
    .join("\n");

  const stylePart = prompt ? `\n用户风格要求：${prompt}` : "";

  return `你是一个音乐创作助手。基于下面的 MIDI 音符数据，续写 4 小节的旋律。

现有音符（格式：pitch, start_step, length, velocity）：
${noteLines || "（暂无音符）"}

${stylePart}

请返回续写的音符数据，格式为 JSON 数组，每个音符包含 pitch（音高 0-127）, start（相对开始位置，从 0 开始）, length（时长步数）, velocity（力度 0-127）：
[{"pitch": 60, "start": 0, "length": 2, "velocity": 100}, ...]

注意：
- 只需要续写 4 小节
- start 是相对位置，从 0 开始（不是绝对步数）
- 旋律要符合音乐逻辑，节奏可以多样化
- 只返回 JSON 数组，不要其他内容`;
}

export async function continueMelody(
  config: AIConfig,
  options: ContinueOptions,
): Promise<PianoRollNote[]> {
  const { notes, stepsPerBar, prompt, lengthInBars = 8, onChunk } = options;
  const model = config.model || DEFAULT_MODEL;

  const apiKey = config.apiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error(
      '请先设置 API Key：setStoredApiKey("your-key") 或通过 UI 设置',
    );
  }

  let startStep = 0;
  if (notes.length > 0) {
    const lastNote = notes.reduce((max, n) => {
      const end = n.startStep + n.length;
      return end > max.startStep + max.length ? n : max;
    }, notes[0]);
    startStep = lastNote.startStep + lastNote.length;
  }

  const promptText = buildPrompt(notes, stepsPerBar, prompt, lengthInBars);

  const response = await fetch(
    "https://api.minimax.chat/v1/text/chatcompletion_v2",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "你是一个专业的音乐创作助手，擅长生成旋律。",
          },
          { role: "user", content: promptText },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} - ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const dataStr = trimmed.slice(5).trim();
      if (dataStr === "[DONE]") continue;

      try {
        const data = JSON.parse(dataStr);
        const chunk = data.choices?.[0]?.delta?.content || "";
        if (chunk) {
          fullContent += chunk;
          onChunk?.(chunk);
        }
      } catch {
        // ignore
      }
    }
  }

  if (!fullContent) {
    throw new Error("AI 返回内容为空");
  }

  let jsonMatch = fullContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI 返回格式错误，无法解析 JSON");
  }

  let jsonStr = jsonMatch[0];
  let attempts = 0;
  while (attempts < 3) {
    try {
      JSON.parse(jsonStr);
      break;
    } catch {
      jsonStr += "]";
      attempts++;
    }
  }

  const aiNotes: AIMusicNote[] = JSON.parse(jsonStr);

  // AI 返回的 start 已经是绝对位置，直接使用
  const newNotes: PianoRollNote[] = aiNotes.map((n, i) => ({
    id: `ai-${Date.now()}-${i}`,
    channelId: notes[0]?.channelId || "",
    pitch: Math.max(0, Math.min(127, n.pitch)),
    startStep: n.start,
    length: Math.max(1, Math.round(n.length)),
    velocity: Math.max(1, Math.min(127, n.velocity)),
  }));

  return newNotes;
}

export function testAIContinue(aiResponse: unknown): PianoRollNote[] {
  const data = aiResponse as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content");

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON found");

  const aiNotes: AIMusicNote[] = JSON.parse(jsonMatch[0]);
  const startStep = 892;

  return aiNotes.map((n, i) => ({
    id: `ai-test-${Date.now()}-${i}`,
    channelId: "",
    pitch: Math.max(0, Math.min(127, n.pitch)),
    startStep: n.start, // 直接使用 AI 返回的绝对位置
    length: Math.max(1, Math.round(n.length)),
    velocity: Math.max(1, Math.min(127, n.velocity)),
  }));
}
