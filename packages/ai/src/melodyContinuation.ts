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

function analyzeKeyHint(notes: PianoRollNote[]): string {
  if (notes.length === 0) return "";
  const pitchClasses = [...new Set(notes.map((n) => n.pitch % 12))].sort(
    (a, b) => a - b,
  );
  const lastNote = notes[notes.length - 1];
  return `分析提示：现有旋律使用了音级 [${pitchClasses.join(", ")}]，最后一个音符为 pitch=${lastNote.pitch}，length=${lastNote.length}。续写时注意音高和节奏的自然衔接。`;
}

function buildPrompt(
  notes: PianoRollNote[],
  stepsPerBar: number,
  prompt?: string,
): string {
  const stepsPerBeat = 4;
  const beatsPerBar = 4;
  const totalStepsPerBar = stepsPerBeat * beatsPerBar;
  const continueFromStep = Math.max(
    ...notes.map((n) => n.startStep + n.length),
  );
  const totalSteps = totalStepsPerBar * 4;

  const contextNotes = notes
    .filter((n) => n.startStep >= continueFromStep - 2 * totalStepsPerBar)
    .sort((a, b) => a.startStep - b.startStep);

  const noteLines = contextNotes
    .map(
      (n) =>
        `pitch=${n.pitch}, start=${n.startStep}, length=${n.length}, vel=${n.velocity}`,
    )
    .join("\n");

  const keyHint = analyzeKeyHint(notes);
  const stylePart = prompt ? `用户风格要求：${prompt}\n` : "";

  return `你是一个专业的 MIDI 编曲助手。请根据已有音符续写 4 小节，同时包含主旋律和低音伴奏。

## 时间轴
- 1 step = 十六分音符，1 小节 = ${totalStepsPerBar} steps
- 已有内容结束于 step ${continueFromStep}
- 续写范围：step ${continueFromStep} 到 step ${continueFromStep + totalSteps - 1}
- ⚠️ 所有 start 是相对续写起点的步数（0 = 续写第一步）

## 接续上文（最近 2 小节）
${noteLines || "（暂无音符，请自由创作）"}

${keyHint}

## 创作规则
${stylePart}
1. **调性**：延续已有音符的调性
2. **衔接**：第一个音符要与上文最后一个音符平滑衔接
3. **节奏**：混合不同时值，避免单调重复
4. **声部要求**：
   - 主旋律（pitch 60~84）：12~18 个音符，旋律线条流畅
   - 低音伴奏（pitch 36~59）：8~12 个音符，落在根音或五音，可用长音或律动型
   - 两个声部的音符混合在同一数组中返回
5. **力度区分**：主旋律 velocity 75~110，低音 velocity 55~80
6. **终止**：第 4 小节末尾用长音结束

## 输出格式
只返回 JSON 数组，主旋律和低音混合排列，按 start 升序，不要任何解释：
[
  {"pitch": 43, "start": ${continueFromStep}, "length": 8, "velocity": 70},
  {"pitch": 67, "start": ${continueFromStep}, "length": 4, "velocity": 88},
  {"pitch": 69, "start": ${continueFromStep + 4}, "length": 4, "velocity": 85}
]`;
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

  const promptText = buildPrompt(notes, stepsPerBar, prompt);

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
  let reasoningContent = "";

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
        const reasoning = data.choices?.[0]?.delta?.reasoning_content || "";
        if (chunk) {
          fullContent += chunk;
          onChunk?.(chunk);
        }
        if (reasoning) {
          reasoningContent += reasoning;
          onChunk?.(`[思考中...] ${reasoning}`);
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

  const newNotes: PianoRollNote[] = aiNotes.map((n, i) => ({
    id: `ai-${Date.now()}-${i}`,
    channelId: notes[0]?.channelId || "",
    pitch: Math.max(0, Math.min(127, n.pitch)),
    startStep: startStep + n.start,
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
    startStep: startStep + n.start,
    length: Math.max(1, Math.round(n.length)),
    velocity: Math.max(1, Math.min(127, n.velocity)),
  }));
}
