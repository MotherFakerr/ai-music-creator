# ADR-002: Monorepo 架构决策

## 状态

✅ 已确认

## 决策

选择 **PNPM + Turborepo** 作为 Monorepo 方案。

## 决策理由

| 方案 | 评估 | 结果 |
|-----|------|------|
| PNPM | 轻量、磁盘占用小、workspace 支持原生 | ✅ 采用 |
| Turborepo | 任务调度、构建缓存、增量构建 | ✅ 采用 |
| Yarn workspace | 功能类似 PNPM，但生态稍弱 | ❌ 不采用 |
| Nx | 功能全但重量级，学习曲线陡 | ❌ 不采用 |

## 包结构设计

```
packages/
├── core/   # 核心模型与类型定义（无外部依赖）
├── audio/  # 音频引擎（依赖 core）
├── midi/   # MIDI 处理（依赖 core）
├── ui/     # UI 组件（依赖 core/audio/midi）
└── ai/     # AI 接入层（依赖 core）
```

### 依赖原则

- **core** 不依赖任何其他 packages（最底层）
- **audio / midi** 依赖 core
- **ui** 可以依赖 core / audio / midi（UI 层）
- **ai** 依赖 core（AI 与 UI 解耦）

## 约束条件

- 所有 packages 必须有独立 `package.json` 和 `tsconfig.json`
- 根目录 `tsconfig.json` 使用 `references` 声明依赖关系
- 根目录 `package.json` 使用 `workspaces` 声明包路径
- 跨包依赖使用 `*` 版本号（PNPM workspace 特性）

## 记录时间

2026-02-11
