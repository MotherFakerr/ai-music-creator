# TECHNICAL.md — 技术文档

> 状态：建设中

## 核心概念定义

| 概念      | 定义                                                |
| --------- | --------------------------------------------------- |
| Note      | 单个音符，包含 pitch、velocity、startTime、duration |
| Track     | 音轨，包含乐器信息和一系列 Notes                    |
| Sequence  | 完整的音乐序列，由多个 Tracks 组成                  |
| Recording | 用户的演奏记录，包含时间戳和按键信息                |

---

## 模块边界与依赖

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Keyboard │ │ Instrument│ │ Performance      │  │
│  │ 虚拟键盘  │ │ Selector │ │ PreviewPanel     │  │
│  └────┬─────┘ └────┬─────┘ └─────────┬────────┘  │
└───────┼─────────────┼─────────────────┼────────────┘
        │             │                 │
        ▼             ▼                 ▼
┌─────────────────────────────────────────────────────┐
│                   Core Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Audio  │ │   MIDI   │ │ Recording│           │
│  │ 音频引擎  │ │ 解析/生成 │ │ 记录管理  │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────┘
        │             │
        ▼             ▼
┌─────────────────────────────────────────────────────┐
│                 Storage Layer                        │
│  ┌──────────┐ ┌──────────┐                        │
│  │  Local  │ │  Cloud  │                        │
│  │  本地存储  │ │  云端同步  │                        │
│  └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────┘
```

---

## 技术栈选择

| 层级      | 选择                        | 状态      | 备注                    |
| --------- | --------------------------- | --------- | ----------------------- |
| 语言      | TypeScript                  | ✅ 已确认 |                        |
| 架构      | Monorepo (PNPM + Turborepo) | ✅ 已确认 |                        |
| 前端框架  | React + Vite               | ✅ 已确认 |                        |
| UI 组件库 | Mantine Core               | ✅ 已确认 | 现代化 React UI 组件库     |
| 音频引擎  | smplr (SoundFont Player)   | ✅ 已确认 | 真实乐器采样              |
| MIDI 处理 | @tonejs/midi               | ✅ 已确认 | MIDI 文件解析             |
| 状态管理  | React Hooks               | ✅ 已确认 | useState / useCallback   |

---

## Monorepo 结构

```
ai-music-creator/
├── package.json              # 根配置，定义 workspaces
├── pnpm-workspace.yaml      # PNPM workspace 配置
├── turbo.json               # Turborepo 配置
├── tsconfig.json           # TypeScript 根配置
└── packages/
    ├── core/              # 核心领域模型与类型定义
    │   ├── src/
    │   │   ├── index.ts           # 导出
    │   │   ├── keyboard-map.ts     # 键盘映射
    │   │   └── useKeyboardMap.ts  # 响应式键盘映射 Hook
    │   └── package.json
    │
    ├── audio/             # 音频引擎 (smplr SoundFont)
    │   ├── src/
    │   │   ├── engine.ts          # 音频引擎核心
    │   │   └── index.ts           # 导出
    │   └── package.json
    │
    ├── midi/              # MIDI 解析与生成 (@tonejs/midi)
    │   ├── src/
    │   │   ├── index.ts           # 导出
    │   │   └── parser.ts          # MIDI 解析器
    │   └── package.json
    │
    ├── ui/                # React UI 组件库
    │   ├── src/
    │   │   ├── Keyboard.tsx              # 虚拟键盘组件
    │   │   ├── InstrumentSelector.tsx     # 音色选择器
    │   │   ├── BaseNoteSelector.tsx       # 基准音选择器
    │   │   ├── PerformancePreviewPanel.tsx # 演奏预览面板
    │   │   ├── useKeyboard.ts            # 键盘事件 Hook
    │   │   └── index.ts                 # 导出
    │   └── package.json
    │
    ├── ai/               # AI 接入层
    │   ├── src/
    │   │   ├── index.ts           # 导出
    │   │   └── service.ts         # AI 服务
    │   └── package.json
    │
    └── web/              # React 应用入口 (Vite)
        ├── src/
        │   ├── App.tsx            # 主应用组件
        │   ├── main.tsx         # 入口文件
        │   ├── theme.ts          # Mantine 主题配置
        │   ├── components/      # 页面级组件
        │   │   ├── AppHeader.tsx       # 应用头部
        │   │   └── SettingsPanel.tsx   # 设置面板
        │   └── hooks/            # 应用级 Hooks
        │       └── usePerformanceLayout.ts
        └── package.json
```

---

## 模块职责

### Audio Engine (`packages/audio`)

**做什么**：
- 管理 Web Audio API 上下文
- 使用 smplr 加载 SoundFont 采样
- 提供音符播放、音色切换、混音能力
- 鼓组使用 Oscillator 模拟

**不做什么**：
- 不处理 MIDI 解析
- 不处理 UI

### MIDI Parser/Generator (`packages/midi`)

**做什么**：
- MIDI 文件与内部数据结构的相互转换
- @tonejs/midi 封装

**不做什么**：
- 不播放音频
- 不做音乐创作决策

### UI Components (`packages/ui`)

**做什么**：
- 可复用、与页面业务解耦的基础组件
- 纯 props 驱动，无页面副作用
- 可在不同页面复用

**不做什么**：
- 不直接依赖 audioEngine、路由、接口请求等业务侧对象
- 不包含应用特有文案、布局策略

### Web Application (`packages/web`)

**做什么**：
- 页面级编排、业务状态流
- 应用特有体验逻辑
- 组合多个基础组件

**不做什么**：
- 不包含可直接复用的基础组件

### 组件归属规则

当一个组件满足以下大部分条件时，放入 `packages/ui`：

- 只通过 `props` 渲染，不依赖页面级状态机或应用上下文
- 不直接依赖 `audioEngine`、路由、接口请求等业务侧对象
- 文案/样式不绑定单一业务场景，可在多个页面复用
- 能被描述为"基础能力"（如选择器、步进器、键盘可视化）

当一个组件满足以下大部分条件时，放入 `packages/web`：

- 是页面区块（Section/Panel/Header）而非基础控件
- 组合多个基础组件并承载业务语义
- 包含应用特有文案、布局策略、交互节奏
- 强依赖当前产品体验（且复用价值较低）

### 当前项目示例

**适合 `packages/ui`**：
- `Keyboard` - 虚拟键盘组件
- `InstrumentSelector` - 音色选择器
- `BaseNoteSelector` - 基准音选择器
- `PerformancePreviewPanel` - 演奏预览面板

**适合 `packages/web`**：
- `AppHeader` - 应用头部（组合标题 + 状态）
- `SettingsPanel` - 设置面板（组合基准音 + 音量）

---

## 键盘映射

### 映射规则

```typescript
// 行 3（A 键）= 基准音
KEYBOARD_ROWS.row3.forEach((key, index) => {
  map[key] = baseNote + index;
});

// 行 2（A 上 1 行）= 基准 + 1 八度 (+12)
KEYBOARD_ROWS.row2.forEach((key, index) => {
  map[key] = baseNote + 12 + index;
});

// 行 1（A 上 2 行）= 基准 + 2 八度 (+24)
KEYBOARD_ROWS.row1.forEach((key, index) => {
  map[key] = baseNote + 24 + index;
});

// 行 4（A 下 1 行）= 基准 - 1 八度 (-12)
KEYBOARD_ROWS.row4.forEach((key, index) => {
  map[key] = baseNote - 12 + index;
});
```

### 键盘行定义

```typescript
export const KEYBOARD_ROWS = {
  row1: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  row2: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  row3: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  row4: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
} as const;
```

---

## 音色配置

### SoundFont 映射

```typescript
const INSTRUMENTS = {
  piano: 'acoustic_grand_piano',
  synth: 'synth_brass_1',
  guitar: 'electric_guitar_clean',
  drum: 'drum_kit',
};
```

### 音色回退机制

当 SoundFont 加载失败时，使用 Web Audio API Oscillator 作为备选：
- **钢琴**: triangle 波形
- **合成器**: sawtooth 波形
- **电吉他**: triangle 波形 + 弦乐质感
- **鼓组**: sine/triangle 波形

---

## 演奏可视化

### 音符轨迹

```typescript
interface PerformanceTrace {
  id: number;
  note: number;
  noteName: string;
  x: number;        // 横向位置 (0-1)
  hue: number;     // 颜色色相 (0-360)
  bornAt: number;    // 创建时间戳
  strength: number;  // 力度 (0-1)
}
```

### 颜色映射

```typescript
// 12 音阶 → 暖色谱
const hue = 8 + ((note % 12) / 12) * 35;
```

---

## 性能优化

- **乐器懒加载**: 按需加载，减少初始加载时间
- **轨迹数组限制**: 最大 48 项，自动清理过期轨迹
- **useMemo 优化**: 键盘映射、计算密集型操作
- **useCallback**: 回调函数稳定，避免不必要的重渲染

---

## 待办

- [ ] 完善 MIDI 解析器
- [ ] 添加录音回放功能
- [ ] 实现 AI 续写服务接入
- [ ] 添加单元测试
