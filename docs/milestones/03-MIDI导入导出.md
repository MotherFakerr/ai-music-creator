# 里程碑3：MIDI导入导出

> 状态：✅ 已完成

## 目标

围绕 sequencer 实现 MIDI 文件的导入导出功能，让用户可以：
- 将钢琴卷帘/通道机架中的音符数据导出为标准 MIDI文件
- 导入外部 MIDI 文件到钢琴卷帘中编辑

## 核心功能

| 功能 | 描述 | 状态 |
|-----|------|------|
| MIDI导出 | 将 sequencer 中的音符数据导出为 .mid 文件 | ✅ |
| MIDI导入 | 解析外部 MIDI 文件，在钢琴卷帘中显示 | ✅ |
| 音符映射 | 支持多音轨、多通道的 MIDI 数据映射 | ✅ |
| 乐器音色导出 | 导出时包含乐器音色信息 (Program Change) | ✅ |
| 乐器音色导入 | 导入时读取 MIDI 文件中的乐器信息 | ✅ |

## 不做

- ❌ 实时录音录制（移交未来里程碑）
- ❌ 音频波形编辑
- ❌ 复杂乐谱排版

## 技术实现

### 文件位置
`packages/sequencer/src/midi.ts`

### 核心 API

```typescript
// 导出 MIDI
export function exportToMidi(
  state: PatternState,
  options?: { tpq?: number; bpm?: number }
): Uint8Array

// 导入 MIDI
export function parseMidi(
  midiData: Uint8Array | ArrayBuffer,
  options?: { tpq?: number; defaultInstrumentId?: string }
): { state: PatternState; errors: string[] }

// 从 File 对象导入
export async function parseMidiFile(file: File): Promise<{ state: PatternState; errors: string[] }>

// 下载 MIDI 文件
export function downloadMidi(midiData: Uint8Array, filename?: string): void
```

### 乐器映射

| 乐器类型 | GM Program Number |
|---------|------------------|
| piano | 0 |
| synth | 80 |
| guitar | 24 |
| distortion_guitar | 29 |
| drum | 0 (通道10) |

### 数据结构

```typescript
interface SequencerChannel {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  instrument: EN_INSTRUMENT_TYPE;
}

interface PianoRollNote {
  id: string;
  channelId: string;
  pitch: number;       // MIDI pitch (0-127)
  startStep: number;  // 步进位置 (16分音符为单位)
  length: number;     // 音符长度
  velocity: number;   // 力度 (0-127)
}
```

## 已知限制

- 导入时仅支持有限的乐器类型映射（piano/guitar/distortion_guitar）
- 导出时固定为 4/4 拍
- 不支持力度曲线编辑

## 成功标准

- ✅ 能导出钢琴卷帘音符为 MIDI 文件
- ✅ 能导入 MIDI 文件并在钢琴卷帘中显示
- ✅ 导出/导入包含乐器音色信息
