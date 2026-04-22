import { useState, useEffect, useCallback } from "react";
import { Button, Collapse, Divider, Drawer, Grid, Input, Select, Space, Typography } from "antd";
import { KnowledgeNode, KnowledgeNodeFile } from "../domain/types";

interface Props {
  node: KnowledgeNode;
  allNodeIds: string[];
  onClose: () => void;
  onSave: (updated: KnowledgeNodeFile) => void;
  zIndex?: number;
}

interface LinkDraft {
  target: string;
  type: string;
  label: string;
}

export default function NodeDetailPanel({ node, allNodeIds, onClose, onSave, zIndex = 40 }: Props) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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
    <Drawer
      open
      title="Node details"
      onClose={onClose}
      mask={false}
      placement={isMobile ? "bottom" : "right"}
      width={isMobile ? undefined : "min(420px, 38vw)"}
      height={isMobile ? "100dvh" : undefined}
      zIndex={zIndex}
      getContainer={false}
      rootClassName="node-detail-drawer"
    >
      <Space direction="vertical" size={16} className="full-width node-detail-content">
        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">Identity</Typography.Title>
          <Typography.Text type="secondary">ID</Typography.Text>
          <div><Typography.Text strong>{node.id}</Typography.Text></div>
        </section>

        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">Basic info</Typography.Title>
          <Space direction="vertical" size={10} className="full-width">
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
          </Space>
        </section>

        <Divider className="node-detail-divider" />

        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">Metadata</Typography.Title>
          <Collapse
            size="small"
            defaultActiveKey={["tags", "relations"]}
            items={[
              {
                key: "tags",
                label: <Typography.Text type="secondary">Tags（逗号分隔）</Typography.Text>,
                children: (
                  <Input
                    size="small"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                  />
                ),
              },
              {
                key: "relations",
                label: <Typography.Text type="secondary">Relations</Typography.Text>,
                children: (
                  <Space direction="vertical" size={8} className="full-width">
                    <div className="node-detail-actions-end">
                      <Button size="small" onClick={addLink}>+ Add relation</Button>
                    </div>
                    {links.map((link, idx) => (
                      <Space key={`${node.id}-link-${idx}`} size={8} className="full-width node-detail-link-row" wrap>
                        <Select
                          size="small"
                          value={link.target || undefined}
                          onChange={(value) => handleLinkChange(idx, "target", value)}
                          placeholder="target…"
                          className="node-detail-select-target"
                          options={otherNodeIds.map((id) => ({ value: id, label: id }))}
                        />
                        <Input
                          size="small"
                          value={link.type}
                          onChange={(e) => handleLinkChange(idx, "type", e.target.value)}
                          placeholder="type"
                          className="node-detail-input-sm"
                        />
                        <Input
                          size="small"
                          value={link.label}
                          onChange={(e) => handleLinkChange(idx, "label", e.target.value)}
                          placeholder="label"
                          className="node-detail-input-sm"
                        />
                        <Button size="small" danger type="text" onClick={() => removeLink(idx)}>×</Button>
                      </Space>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        </section>

        <div className="node-detail-actions-end">
          <Button size="small" type="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </Space>
    </Drawer>
  );
}
