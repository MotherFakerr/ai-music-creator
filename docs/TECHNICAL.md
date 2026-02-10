# TECHNICAL.md — 技术文档

> 状态：待定

## 核心概念定义

| 概念 | 定义 |
|-----|------|
| Note | 单个音符，包含 pitch、velocity、startTime、duration |
| Track | 音轨，包含乐器信息和一系列 Notes |
| Sequence | 完整的音乐序列，由多个 Tracks 组成 |
| Recording | 用户的演奏记录，包含时间戳和按键信息 |

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

| 层级 | 选项 | 状态 | 备注 |
|-----|------|------|------|
| 语言 | TypeScript | ✅ 已确认 | |
| 架构 | Monorepo (PNPM + Turborepo) | ✅ 已确认 | |
| 前端框架 | React / Vue / Svelte | ⏳ | 待决策 |
| 音频引擎 | Web Audio API / Tone.js | ⏳ | Tone.js 更友好 |
| MIDI处理 | @midi / midicube | ⏳ | 待评估 |
| 状态管理 | Zustand / Jotai / Redux | ⏳ | 待决策 |
| UI组件 | 待定 | ⏳ | |
| AI接入 | OpenAI API / 本地模型 | ⏳ | 待需求细化 |

## Monorepo 结构

```
root/
├── package.json           # 根配置，定义 workspaces
├── pnpm-workspace.yaml    # PNPM workspace 配置
├── turbo.json             # Turborepo 配置
├── tsconfig.json          # TypeScript 根配置
└── packages/
    ├── core/             # 核心领域模型与类型定义
    │   ├── src/index.ts
    │   ├── package.json
    │   └── tsconfig.json
    ├── audio/            # 音频引擎 (Web Audio API)
    │   ├── src/index.ts
    │   ├── package.json
    │   └── tsconfig.json
    ├── midi/             # MIDI 解析与生成
    │   ├── src/index.ts
    │   ├── package.json
    │   └── tsconfig.json
    ├── ui/               # UI 组件
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── Keyboard.tsx
    │   │   ├── Timeline.tsx
    │   │   └── Controls.tsx
    │   ├── package.json
    │   └── tsconfig.json
    └── ai/               # AI 接入层
        ├── src/index.ts
        ├── package.json
        └── tsconfig.json
```

## 模块职责

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
