# TECHNICAL.md — 技术文档

> 状态：待定

## 核心概念定义

| 概念      | 定义                                                |
| --------- | --------------------------------------------------- |
| Note      | 单个音符，包含 pitch、velocity、startTime、duration |
| Track     | 音轨，包含乐器信息和一系列 Notes                    |
| Sequence  | 完整的音乐序列，由多个 Tracks 组成                  |
| Recording | 用户的演奏记录，包含时间戳和按键信息                |

## 模块边界与依赖

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Keyboard │ │  Player  │ │  Editor  │ │  AI      │ │
│  │ 演奏界面  │ │  播放控制 │ │  谱面编辑 │ │  AI面板   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└───────┼─────────────┼─────────────┼─────────────┼───────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────┐
│                   Core Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Audio   │ │   MIDI   │ │ Recording │ │   AI     │ │
│  │ 音频引擎  │ │ 解析/生成 │ │  记录管理 │ │ 接入层   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────┘
        │             │
        ▼             ▼
┌─────────────────────────────────────────────────────┐
│                 Storage Layer                        │
│  ┌──────────┐ ┌──────────┐                          │
│  │  Local   │ │  Cloud   │                          │
│  │  本地存储  │ │  云端同步  │                          │
│  └──────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

## 技术栈选择（待定）

| 层级      | 选项                        | 状态      | 备注           |
| --------- | --------------------------- | --------- | -------------- |
| 语言      | TypeScript                  | ✅ 已确认 |                |
| 架构      | Monorepo (PNPM + Turborepo) | ✅ 已确认 |                |
| 前端框架  | React                       | ✅ 已确认 | Vite 构建      |
| 音频引擎  | Web Audio API / Tone.js     | ⏳        | Tone.js 更友好 |
| MIDI 处理 | @midi / midicube            | ⏳        | 待评估         |
| 状态管理  | Zustand / Jotai / Redux     | ⏳        | 待决策         |
| UI 组件   | 待定                        | ⏳        |                |
| AI 接入   | OpenAI API / 本地模型       | ⏳        | 待需求细化     |

## Monorepo 结构

```
root/
├── package.json           # 根配置，定义 workspaces
├── pnpm-workspace.yaml    # PNPM workspace 配置
├── turbo.json             # Turborepo 配置
├── tsconfig.json          # TypeScript 根配置
└── packages/
    ├── core/             # 核心领域模型与类型定义
    ├── audio/            # 音频引擎 (Web Audio API)
    ├── midi/             # MIDI 解析与生成
    ├── ui/               # React UI 组件库
    ├── ai/               # AI 接入层
    └── web/              # React 应用入口 (Vite)
```

## 模块职责

### UI 与 Web 分层约定

`packages/ui` 与 `packages/web` 的边界定义如下：

- `packages/ui`：可复用、与具体页面业务解耦的基础组件/交互模式
- `packages/web`：页面级编排、业务状态流、应用特有体验逻辑

#### 组件归属判断（落地规则）

当一个组件满足以下大部分条件时，放入 `packages/ui`：

- 只通过 `props` 渲染，不依赖页面级状态机或应用上下文
- 不直接依赖 `audioEngine`、路由、接口请求等业务侧对象
- 文案/样式不绑定单一业务场景，可在多个页面复用
- 能被描述为“基础能力”（如选择器、步进器、键盘可视化）

当一个组件满足以下大部分条件时，放入 `packages/web`：

- 是页面区块（Section/Panel/Header）而非基础控件
- 组合多个基础组件并承载业务语义
- 包含应用特有文案、布局策略、交互节奏
- 强依赖当前产品体验（且复用价值较低）

#### 当前项目示例

- 适合 `packages/ui`：

  - `BaseNoteSelector`
  - `InstrumentSelector`
  - `Keyboard`
  - `PerformancePreviewPanel`

- 适合 `packages/web`：
  - `AppHeader`
  - `SettingsPanel`

> 说明：`PerformancePreviewPanel` 已迁移到 `packages/ui`，因为该组件已是纯 `props` 驱动、无页面副作用、可在不同页面复用。

#### 推荐演进方式

- 不将完整业务组件直接搬入 `ui`
- 优先从 `web` 组件中提炼“可复用原子/模式”到 `ui`
- 保持 `web` 负责“编排”，`ui` 负责“能力”

### Audio Engine

**做什么**：管理 Web Audio API，提供音符播放、音色切换、音频混合能力。

**不做什么**：不处理 MIDI 解析，不处理 UI。

### MIDI Parser/Generator

**做什么**：MIDI 文件与内部数据结构的相互转换。

**不做什么**：不播放音频，不做音乐创作决策。

### Recording Manager

**做什么**：捕获用户键盘输入，记录时间戳，生成 Recording 数据。

**不做什么**：不处理音频播放，不做回放逻辑。

### AI Service

**做什么**：接收 Sequence，调用 AI 模型，返回续写的 Sequence。

**不做什么**：不管理本地存储，不处理 UI。
