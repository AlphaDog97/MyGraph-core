"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Input, Modal, Select, Space, Typography, message } from "antd";
import type { CategorySummary } from "@/app/lib/types";
import { parseGraphImport } from "@/app/lib/graph-import";
import { IMPORT_AI_PROMPT, IMPORT_EXAMPLE } from "./graph-import-example";

interface Props {
  categoryId: string;
  categories: CategorySummary[];
  onClose: () => void;
  onImported: (categoryId: string, graphIds: string[]) => Promise<void>;
}

export function GraphImportDialog({ categoryId, categories, onClose, onImported }: Props) {
  const [targetCategory, setTargetCategory] = useState(categoryId || categories[0]?.id || "");
  const [graphLabel, setGraphLabel] = useState("导入的图谱");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => {
    if (!rawText.trim()) return { document: null, error: "" };
    try { return { document: parseGraphImport(rawText, graphLabel), error: "" }; }
    catch (cause) { return { document: null, error: cause instanceof Error ? cause.message : "格式不正确" }; }
  }, [rawText, graphLabel]);

  const submit = async () => {
    if (busy || !preview.document || !targetCategory) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/graphs/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: targetCategory, graphLabel, rawText }),
      });
      const result = await response.json() as {
        error?: string; graphIds: string[]; graphCount: number; nodeCount: number; edgeCount: number;
      };
      if (!response.ok) throw new Error(result.error ?? "导入失败，请重试");
      message.success(`已导入 ${result.graphCount} 个图谱、${result.nodeCount} 个节点、${result.edgeCount} 条关系`);
      // A view refresh failure must not invite a second import of already-saved data.
      try { await onImported(targetCategory, result.graphIds); }
      catch { message.warning("图谱已保存，请刷新页面查看"); }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "导入失败，请重试");
    } finally { setBusy(false); }
  };

  return (
    <Modal open title="导入图谱 JSON" width={760} onCancel={onClose}
      closable={!busy} maskClosable={!busy} keyboard={!busy}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={busy}>取消</Button>,
        <Button key="import" type="primary" loading={busy} onClick={() => void submit()}
          disabled={!targetCategory || !preview.document}>确认导入</Button>,
      ]}>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          粘贴 AI 生成的 JSON 或原版节点数组。每次导入都会新建图谱并保存，不会覆盖已有内容。
        </Typography.Text>
        <div>
          <label htmlFor="graph-import-category">导入到分类</label>
          <Select id="graph-import-category" value={targetCategory || undefined} onChange={setTargetCategory}
            style={{ width: "100%", marginTop: 6 }} disabled={busy}
            options={categories.map((category) => ({ value: category.id, label: category.label }))}
            placeholder="请选择分类" />
        </div>
        {!categories.length ? <Alert type="warning" showIcon message="请先创建一个分类，再导入图谱" /> : null}
        <div>
          <label htmlFor="graph-import-name">默认图谱名称（JSON 未提供 graphLabel 时使用）</label>
          <Input id="graph-import-name" value={graphLabel} onChange={(event) => setGraphLabel(event.target.value)}
            disabled={busy} style={{ marginTop: 6 }} />
        </div>
        <Space wrap>
          <Button size="small" disabled={busy} onClick={() => { setRawText(IMPORT_EXAMPLE); setError(""); }}>填入示例</Button>
          <Typography.Text copyable={{ text: IMPORT_AI_PROMPT }}>复制 AI 生成提示词</Typography.Text>
        </Space>
        <Input.TextArea aria-label="图谱 JSON" value={rawText} disabled={busy}
          onChange={(event) => { setRawText(event.target.value); setError(""); }}
          placeholder="在此粘贴 JSON，支持完整的 ```json 代码块"
          autoSize={{ minRows: 10, maxRows: 18 }} style={{ fontFamily: "monospace" }} />
        {preview.error || error ? <Alert type="error" showIcon message={error || preview.error} /> : null}
        {preview.document ? <Alert type="success" showIcon message={
          `校验通过：${preview.document.graphs.length} 个图谱 · ${preview.document.nodeCount} 个节点 · ${preview.document.edgeCount} 条关系`
        } description={<span style={{ overflowWrap: "anywhere" }}>
          {preview.document.graphs.map((graph) => graph.graphLabel).join("、")}
          <br />全部保存到上方所选分类；JSON 中的 categoryId 不会改变导入位置。
        </span>} /> : null}
      </Space>
    </Modal>
  );
}
