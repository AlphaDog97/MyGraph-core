import { useState, useEffect, useCallback } from "react";
import { Button, Card, Input, Select, Space, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { KnowledgeNode, KnowledgeNodeFile } from "../domain/types";

interface Props {
  node: KnowledgeNode;
  allNodeIds: string[];
  onClose: () => void;
  onSave: (updated: KnowledgeNodeFile) => void;
}

interface LinkDraft {
  target: string;
  type: string;
  label: string;
}

export default function NodeDetailPanel({ node, allNodeIds, onClose, onSave }: Props) {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.description);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  const [links, setLinks] = useState<LinkDraft[]>(
    node.links.map((l) => ({ target: l.target, type: l.type, label: l.label ?? "" }))
  );

  useEffect(() => {
    setLabel(node.label);
    setDescription(node.description);
    setTagsText(node.tags.join(", "));
    setLinks(node.links.map((l) => ({ target: l.target, type: l.type, label: l.label ?? "" })));
  }, [node]);

  const handleLinkChange = useCallback((idx: number, field: keyof LinkDraft, value: string) => {
    setLinks((prev) => prev.map((item, index) => (index === idx ? { ...item, [field]: value } : item)));
  }, []);
  const addLink = useCallback(() => setLinks((prev) => [...prev, { target: "", type: "", label: "" }]), []);
  const removeLink = useCallback((idx: number) => setLinks((prev) => prev.filter((_, index) => index !== idx)), []);

  const handleSave = useCallback(() => {
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const cleanedLinks = links
      .filter((l) => l.target.trim() && l.type.trim())
      .map((l) => ({
        target: l.target.trim(),
        type: l.type.trim(),
        ...(l.label.trim() ? { label: l.label.trim() } : {}),
      }));

    const updated: KnowledgeNodeFile = {
      id: node.id,
      label: label.trim() || node.label,
      tags,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(cleanedLinks.length > 0 ? { links: cleanedLinks } : {}),
    };

    onSave(updated);
  }, [description, label, links, node.id, node.label, onSave, tagsText]);

  const otherNodeIds = allNodeIds.filter((id) => id !== node.id);

  return (
    <Card
      size="small"
      title="Node details"
      extra={<Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />}
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        width: 420,
        maxHeight: "calc(100% - 32px)",
        overflowY: "auto",
        zIndex: 4,
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <Typography.Text type="secondary">ID</Typography.Text>
          <div><Typography.Text>{node.id}</Typography.Text></div>
        </div>
        <div>
          <Typography.Text type="secondary">Label</Typography.Text>
          <Input size="small" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <Typography.Text type="secondary">Description</Typography.Text>
          <Input.TextArea
            size="small"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Typography.Text type="secondary">Tags（逗号分隔）</Typography.Text>
          <Input size="small" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text type="secondary">Links</Typography.Text>
            <Button size="small" onClick={addLink}>+ Add link</Button>
          </div>
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {links.map((link, idx) => (
              <Space key={`${node.id}-link-${idx}`} size={8} style={{ width: "100%" }} wrap>
                <Select
                  size="small"
                  value={link.target || undefined}
                  onChange={(value) => handleLinkChange(idx, "target", value)}
                  placeholder="target…"
                  style={{ minWidth: 120 }}
                  options={otherNodeIds.map((id) => ({ value: id, label: id }))}
                />
                <Input
                  size="small"
                  value={link.type}
                  onChange={(e) => handleLinkChange(idx, "type", e.target.value)}
                  placeholder="type"
                  style={{ width: 100 }}
                />
                <Input
                  size="small"
                  value={link.label}
                  onChange={(e) => handleLinkChange(idx, "label", e.target.value)}
                  placeholder="label"
                  style={{ width: 100 }}
                />
                <Button size="small" danger type="text" onClick={() => removeLink(idx)}>×</Button>
              </Space>
            ))}
          </Space>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="small" type="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </Space>
    </Card>
  );
}
