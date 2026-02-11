# 🎵 AI Music Co-Creator

前端音乐创作软件，支持键盘演奏、跟奏、MIDI结构化记录、AI续写。

## 文档结构

| 类型 | 文件 | 说明 |
|-----|------|------|
| 产品 | [docs/PRODUCT.md](./docs/PRODUCT.md) | 产品定义、用户、核心功能 |
| 技术 | [docs/TECHNICAL.md](./docs/TECHNICAL.md) | 架构、模块边界、技术选型 |
| 里程碑 | [docs/milestones/](./docs/milestones/) | 各功能的产品需求文档 |
| 决策 | [docs/ADR/](./docs/ADR/) | 技术决策记录 |
| 演进 | [docs/EVOLUTION.md](./docs/EVOLUTION.md) | 方向变化记录 |
| 复盘 | [docs/RETROSPECTIVE.md](./docs/RETROSPECTIVE.md) | 问题复盘与改进 |

## 核心功能

1. 🎹 **演奏** — 键盘控制演奏
2. 🎵 **跟奏** — 上传伴奏 + 键盘跟奏
3. 🎼 **MIDI记录** — 结构化存储（乐器/音高/节拍）
4. 🤖 **AI共创** — 基于记录，AI续写曲谱

## 技术栈

- TypeScript + Monorepo (PNPM + Turborepo)
- React + Vite
