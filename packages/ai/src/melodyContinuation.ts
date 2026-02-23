/**
 * AI 续写服务 - 基于 Minimax API
 */

// PianoRoll 音符类型（复用 sequencer 定义，避免循环依赖）
export interface PianoRollNote {
  id: string;
  channelId: string;
  pitch: number;
  startStep: number;
  length: number;
  velocity: number;
}

export interface AIConfig {
  apiKey?: string;       // 优先使用传入的 key
  model?: string;
}

const STORAGE_KEY = 'ai-music-minimax-key';

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, apiKey);
}

// 暴露到 window 方便调试
if (typeof window !== 'undefined') {
  (window as unknown as { setStoredApiKey: typeof setStoredApiKey }).setStoredApiKey = setStoredApiKey;
  (window as unknown as { getStoredApiKey: typeof getStoredApiKey }).getStoredApiKey = getStoredApiKey;
}

export interface ContinueOptions {
  notes: PianoRollNote[];      // 当前 channel 的音符
  stepsPerBar: number;         // 每小节步数
  prompt?: string;            // 用户输入的风格提示词
  lengthInBars?: number;       // 续写长度（默认 8 小节）
}

interface AIMusicNote {
  pitch: number;
  start: number;
  length: number;
  velocity: number;
}

const DEFAULT_MODEL = 'MiniMax-M2.1';

function buildPrompt(notes: PianoRollNote[], stepsPerBar: number, prompt?: string, lengthInBars = 8): string {
  const noteLines = notes
    .sort((a, b) => a.startStep - b.startStep)
    .map(n => `${n.pitch}, ${n.startStep}, ${n.length}, ${n.velocity}`)
    .join('\n');

  const stylePart = prompt ? `\n用户风格要求：${prompt}` : '';

  return `你是一个音乐创作助手。基于下面的 MIDI 音符数据，续写 ${lengthInBars} 小节的旋律。

现有音符（格式：pitch, start_step, length, velocity）：
${noteLines || '（暂无音符）'}

${stylePart}

请返回续写的音符数据，格式为 JSON 数组，每个音符包含 pitch（音高 0-127）, start（开始步数）, length（时长步数）, velocity（力度 0-127）：
[{"pitch": 60, "start": 16, "length": 2, "velocity": 100}, ...]

注意：
- start 从最后一个音符的结束位置开始
- 旋律要符合音乐逻辑，节奏可以多样化
- 只返回 JSON 数组，不要其他内容`;
}

export async function continueMelody(config: AIConfig, options: ContinueOptions): Promise<PianoRollNote[]> {
  const { notes, stepsPerBar, prompt, lengthInBars = 8 } = options;
  const model = config.model || DEFAULT_MODEL;

  // 优先使用传入的 API Key，否则从 localStorage 读取
  const apiKey = config.apiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error('请先设置 API Key：setStoredApiKey("your-key") 或通过 UI 设置');
  }

  // 找到最后一个音符的结束位置
  let startStep = 0;
  if (notes.length > 0) {
    const lastNote = notes.reduce((max, n) => {
      const end = n.startStep + n.length;
      return end > max.startStep + max.length ? n : max;
    }, notes[0]);
    startStep = lastNote.startStep + lastNote.length;
  }

  const promptText = buildPrompt(notes, stepsPerBar, prompt, lengthInBars);

  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个专业的音乐创作助手，擅长生成旋律。' },
        { role: 'user', content: promptText },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  // 解析 JSON（处理可能的 markdown 代码块）
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI 返回格式错误，无法解析 JSON');
  }

  const aiNotes: AIMusicNote[] = JSON.parse(jsonMatch[0]);

  // 转换为 PianoRollNote
  const newNotes: PianoRollNote[] = aiNotes.map((n, i) => ({
    id: `ai-${Date.now()}-${i}`,
    channelId: notes[0]?.channelId || '',
    pitch: Math.max(0, Math.min(127, n.pitch)),
    startStep: startStep + n.start,
    length: Math.max(1, Math.round(n.length)),
    velocity: Math.max(1, Math.min(127, n.velocity)),
  }));

  return newNotes;
}
