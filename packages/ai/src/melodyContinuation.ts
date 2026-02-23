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
  const noteLines = notes
    .sort((a, b) => a.startStep - b.startStep)
    .map((n) => `${n.pitch}, ${n.startStep}, ${n.length}, ${n.velocity}`)
    .join("\n");

  const stepsPerBeat = 4;
  const beatsPerBar = 4;
  const totalStepsPerBar = stepsPerBeat * beatsPerBar;
  const totalSteps = totalStepsPerBar * 4;

  const keyHint = analyzeKeyHint(notes);
  const stylePart = prompt ? `\n用户风格要求：${prompt}` : "";

  return `你是一个专业的 MIDI 旋律创作助手。请根据已有旋律续写 4 小节。

## 单位说明
- 1 step = 1/4 拍（十六分音符）
- 1 拍 = ${stepsPerBeat} steps
- 1 小节 = ${totalStepsPerBar} steps（4/4 拍）
- 续写范围：start 从 0 到 ${totalSteps - 1}，共 ${totalSteps} steps（4 小节）

## 已有旋律（格式：pitch, start_step, length, velocity）
${noteLines || "（暂无音符，请自由创作）"}

${keyHint}

## 创作要求
${stylePart}

## 音乐规则（必须遵守）
1. **调性一致**：分析上方音符的调性，续写时使用相同调的音阶音符
2. **旋律衔接**：续写的第一个音符要在音高和节奏上自然衔接上方最后一个音符
3. **节奏多样**：混合使用不同时值（如 length = 1/2/4/8），避免全部相同长度
4. **音域合理**：pitch 保持在 48~84 之间（C3~C6），避免跳跃超过 12 个半音
5. **力度变化**：velocity 在 60~110 之间变化，体现强弱对比，不要全部相同
6. **音符密度**：4 小节内安排 12~20 个音符，避免过于稀疏或拥挤
7. **结构感**：第 4 小节最后应有终止感（可用长音符结束）

## 输出格式
只返回 JSON 数组，不要任何解释文字：
[{"pitch": 64, "start": 0, "length": 4, "velocity": 90}, {"pitch": 62, "start": 4, "length": 2, "velocity": 80}]

字段说明：
- pitch: MIDI 音高（0-127）
- start: 相对续写起点的步数（0 = 续写第一步）
- length: 时长步数（1=十六分音符, 4=四分音符, 8=二分音符, 16=全音符）
- velocity: 力度（0-127）`;
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
