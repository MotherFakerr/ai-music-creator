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

| 里程碑 | 功能 | 状态 |
|-------|------|------|
| 1 | 🎹 **演奏** — 键盘控制演奏，真实乐器音色 | ✅ 已完成 |
| 2 | 🎵 **跟奏** — 上传伴奏 + 键盘跟奏 | ✅ 已完成 |
| 2.5 | 🎛️ **编曲工作台** — 通道机架 + 钢琴卷帘 | ✅ 已完成 |
| 3 | 🎼 **MIDI导入导出** — MIDI文件读写 | ✅ 已完成 |
| 4 | 🤖 **AI共创** — 基于记录，AI续写曲谱 | ⏳ 待开发 |

## 技术栈

| 层级 | 选择 |
|-----|------|
| 语言 | TypeScript |
| 架构 | Monorepo (PNPM + Turborepo) |
| 前端框架 | React + Vite |
| UI 组件库 | Mantine Core |
| 音频引擎 | smplr (SoundFont Player) |
| MIDI 处理 | @tonejs/midi |

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 项目结构

```
packages/
├── core/       # 核心领域模型与类型定义
├── audio/      # 音频引擎 (smplr SoundFont)
├── midi/       # MIDI 解析与生成
├── sequencer/  # 编曲工作台 (通道机架 + 钢琴卷帘 + MIDI导入导出)
├── ui/         # React UI 组件库
├── ai/         # AI 接入层
└── web/        # React 应用入口
```

---

## 里程碑一成果

**演奏功能**已完成：
- ✅ QWERTY 键盘 → 音符映射（C2-B5）
- ✅ 4 种真实乐器音色（钢琴、合成器、电吉他、鼓组）
- ✅ 演奏可视化（轨迹效果 + 多音符显示）
- ✅ 基准音调节、音量控制
- ✅ 响应式布局（Mantine UI）

**技术亮点**：
- smplr SoundFont 采样，音色真实
- 演奏轨迹粒子效果
- 性能优化（懒加载、数组限制）

## 里程碑二成果

**跟奏功能**已完成：
- ✅ 音频文件上传与播放（支持 MP3/WAV）
- ✅ 实时键盘跟奏（与伴奏同步）
- ✅ 节奏可视化
- ✅ 播放控制（播放/暂停/停止/进度拖拽）

**技术亮点**：
- Web Audio API 音频解码与播放
- 伴奏与演奏音轨混合输出
- 实时节拍计算与同步

## 里程碑二点五成果（阶段性）

**编曲工作台基础能力**已实现：
- ✅ Channel Rack + Piano Roll 基础编曲闭环（新增、编辑、回放）
- ✅ 通道控制（Mute/Solo/Volume/Instrument）与播放联动

## 里程碑三成果

**MIDI 导入导出**已完成：
- ✅ MIDI 导出：支持音符 + 乐器音色
- ✅ MIDI 导入：解析多音轨、读取乐器信息
- ✅ 音符与通道映射
