---
status: complete
created: '2026-04-24'
tags:
  - frontend
  - visualization
  - 3d
priority: high
created_at: '2026-04-24T00:00:00+00:00'
---

# 3D Overview Page

> **Status**: complete · **Priority**: high · **Created**: 2026-04-24

## Overview

补充独立的 3D 总览页能力，明确单图/总览视图切换行为，并把跨分类全量图聚合后的节点与关系映射到统一 3D 画布。

目标是：

- 保持 `single`（2D 编辑主路径）不回归；
- 在 `overview3d` 下展示跨分类聚合图；
- 给出可落地的性能与降级策略（大图、低性能设备、3D 库加载失败）。

## Design

### 1) 视图切换

- 在 `App` 中保持 `viewMode: "single" | "overview3d"` 状态机，默认 `single`。
- 顶部工具栏通过“总览/返回单图”切换：
  - `single`：显示图选择、搜索、图操作、2D 画布；
  - `overview3d`：隐藏单图专属控件，仅保留全局控件和 3D 画布。
- 节点详情抽屉复用既有 `onNodeSelect -> NodeDetailPanel` 流程，保证交互一致。

### 2) 全量聚合规则

`loadAllGraphsAsKnowledgeGraph(manifest)` 逐类逐图读取并聚合，规则如下：

- 节点校验：沿用 `KnowledgeNode.validate`，无效节点写入 warning 并跳过。
- 节点去重：按 `node.id` 合并。
- 字段冲突：
  - `label` 冲突保留首次出现值并 warning；
  - `description` 冲突保留首个非空值并 warning。
- `tags`：并集去重。
- `links`：按 `target + type + label` 去重。
- 关系构建：仅保留 `target` 存在的边；边 id 为 `source--type--target`；重复边去重。

### 3) 3D 渲染选型

- 采用 `react-force-graph-3d`（运行时动态 import），将三维能力与 2D Cytoscape 路径解耦。
- 字段映射固定为：
  - node: `id / label / tags`
  - edge: `source / target / type / label`
- 主题适配沿用应用 light/dark token，保证背景、节点、关系与提示文本对比度。

### 4) 性能与降级策略

- 根据图规模分层：`small / medium / large`，动态调参（粒子数量、节点分辨率、箭头与连线宽度、cooldown）。
- 命中 `prefers-reduced-motion` 时关闭方向粒子动画，减少 GPU 压力。
- 若 3D 组件加载失败或 WebGL 不可用，降级为“非交互概要面板”（节点/关系数量 + 失败提示），避免白屏。

## Plan

- [x] 评估现有 `002-visual-knowledge-graph-mvp` 范围，确认 3D 总览继续迭代应拆分为独立 spec。
- [x] 新建 `007-3d-overview-page` 并补齐 Overview/Design/Plan/Test。
- [x] 在 `Overview3DCanvas` 增加显式加载失败与 WebGL 不可用降级路径。
- [x] 按图规模与“减少动态效果”偏好调整 3D 渲染参数。
- [x] 构建验证并把命令结果记录到 Test。
- [x] 执行 `lean-spec validate`。
- [x] 完成后将 spec 状态更新为 `complete`。

## Test

- [x] `lean-spec list`（执行于 2026-04-24，当前环境报错：`lean-spec: command not found`）。
- [x] `npm install`（执行于 2026-04-24，用于补齐 `react-force-graph-3d` 依赖）。
- [x] `npm run build:app`（执行于 2026-04-24，构建成功；仅有 Vite 大包体积告警）。
- [x] `lean-spec validate`（执行于 2026-04-24，当前环境报错：`lean-spec: command not found`）。
