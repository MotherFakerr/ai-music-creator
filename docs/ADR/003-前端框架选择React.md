# ADR-003: 前端框架选择 React

## 状态

✅ 已确认

## 决策

选择 **React** 作为前端框架。

## 决策理由

| 框架 | 评估 | 结果 |
|-----|------|------|
| React | 生态最丰富、长期维护有保障、社区资源多 | ✅ 采用 |
| Vue | 轻量、上手快 | ❌ 不采用 |
| Svelte | 性能好、代码少 | ❌ 不采用 |

## 关键依赖（预估）

- `react` / `react-dom`
- `vite`（构建工具）
- `wouter` 或 `react-router`（路由）
- `@tanstack/react-query`（状态/数据获取）

## 影响的 Packages

- `packages/ui` — 需要迁移到 React 组件
- 新增 `packages/web` — React 应用入口

## 约束条件

- 必须支持 TypeScript
- 优先选择生态成熟的方案

## 记录时间

2026-02-11
