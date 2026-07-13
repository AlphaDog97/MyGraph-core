import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Collapse,
  Divider,
  Drawer,
  Grid,
  Input,
  Select,
  Space,
  Typography,
} from "antd";
import { EDGE_TYPE_ORDER } from "../domain/edgeTypes";
import type { KnowledgeNode, KnowledgeNodeFile } from "../domain/types";

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

function toLinkDrafts(node: KnowledgeNode): LinkDraft[] {
  return node.links.map((link) => ({
    target: link.target,
    type: link.type,
    label: link.label ?? "",
  }));
}

export default function NodeDetailPanel({
  node,
  allNodeIds,
  onClose,
  onSave,
  zIndex = 40,
}: Props) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const readOnly = node.isAggregate;
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.description);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  const [links, setLinks] = useState<LinkDraft[]>(() => toLinkDrafts(node));

  useEffect(() => {
    setLabel(node.label);
    setDescription(node.description);
    setTagsText(node.tags.join(", "));
    setLinks(toLinkDrafts(node));
  }, [node]);

  const otherNodeIds = useMemo(
    () => allNodeIds.filter((id) => id !== node.id),
    [allNodeIds, node.id]
  );

  const handleLinkChange = useCallback(
    (index: number, field: keyof LinkDraft, value: string) => {
      setLinks((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const addLink = useCallback(() => {
    setLinks((current) => [
      ...current,
      { target: "", type: EDGE_TYPE_ORDER[0], label: "" },
    ]);
  }, []);

  const removeLink = useCallback((index: number) => {
    setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (readOnly) return;
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const cleanedLinks = links
      .filter((link) => link.target.trim() && link.type.trim())
      .map((link) => ({
        target: link.target.trim(),
        type: link.type.trim(),
        ...(link.label.trim() ? { label: link.label.trim() } : {}),
      }));

    onSave({
      id: node.id,
      label: label.trim() || node.label,
      tags,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(cleanedLinks.length > 0 ? { links: cleanedLinks } : {}),
      ...(node.globalConceptId
        ? { globalConceptId: node.globalConceptId }
        : {}),
    });
  }, [description, label, links, node, onSave, readOnly, tagsText]);

  return (
    <Drawer
      open
      title={readOnly ? "Node details · overview" : "Node details"}
      onClose={onClose}
      mask={false}
      placement={isMobile ? "bottom" : "right"}
      width={isMobile ? undefined : "min(440px, 40vw)"}
      height={isMobile ? "100dvh" : undefined}
      zIndex={zIndex}
      getContainer={false}
      rootClassName="node-detail-drawer"
    >
      <Space
        direction="vertical"
        size={16}
        className="full-width node-detail-content"
      >
        {readOnly && (
          <Alert
            type="info"
            showIcon
            message="Overview nodes are read-only"
            description="This node uses a scoped or shared cross-graph identity. Edit it from its source graph to avoid writing to the wrong graph file."
          />
        )}

        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">
            Identity
          </Typography.Title>
          <Typography.Text type="secondary">Local ID</Typography.Text>
          <div>
            <Typography.Text strong>{node.localId}</Typography.Text>
          </div>
          {node.id !== node.localId && (
            <>
              <Typography.Text type="secondary">Overview ID</Typography.Text>
              <div>
                <Typography.Text code>{node.id}</Typography.Text>
              </div>
            </>
          )}
          {node.globalConceptId && (
            <>
              <Typography.Text type="secondary">
                Global concept ID
              </Typography.Text>
              <div>
                <Typography.Text code>{node.globalConceptId}</Typography.Text>
              </div>
            </>
          )}
        </section>

        {node.provenance.length > 0 && (
          <section className="node-detail-section">
            <Typography.Title level={5} className="node-detail-heading">
              Sources
            </Typography.Title>
            <Space direction="vertical" size={6} className="full-width">
              {node.provenance.map((source) => (
                <Typography.Text
                  key={`${source.categoryId}:${source.graphId}:${source.localNodeId}`}
                >
                  {source.categoryId} / {source.graphLabel} ({source.localNodeId})
                </Typography.Text>
              ))}
            </Space>
          </section>
        )}

        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">
            Basic info
          </Typography.Title>
          <Space direction="vertical" size={10} className="full-width">
            <div>
              <Typography.Text type="secondary">Label</Typography.Text>
              <Input
                size="small"
                value={label}
                disabled={readOnly}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div>
              <Typography.Text type="secondary">Description</Typography.Text>
              <Input.TextArea
                size="small"
                rows={3}
                value={description}
                disabled={readOnly}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </Space>
        </section>

        <Divider className="node-detail-divider" />

        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">
            Metadata
          </Typography.Title>
          <Collapse
            size="small"
            defaultActiveKey={["tags", "relations"]}
            items={[
              {
                key: "tags",
                label: (
                  <Typography.Text type="secondary">
                    Tags（逗号分隔）
                  </Typography.Text>
                ),
                children: (
                  <Input
                    size="small"
                    value={tagsText}
                    disabled={readOnly}
                    onChange={(event) => setTagsText(event.target.value)}
                  />
                ),
              },
              {
                key: "relations",
                label: (
                  <Typography.Text type="secondary">Relations</Typography.Text>
                ),
                children: (
                  <Space direction="vertical" size={8} className="full-width">
                    {!readOnly && (
                      <div className="node-detail-actions-end">
                        <Button size="small" onClick={addLink}>
                          + Add relation
                        </Button>
                      </div>
                    )}
                    {links.map((link, index) => (
                      <Space
                        key={`${node.id}-link-${index}`}
                        size={8}
                        className="full-width node-detail-link-row"
                        wrap
                      >
                        <Select
                          size="small"
                          value={link.target || undefined}
                          disabled={readOnly}
                          onChange={(value) =>
                            handleLinkChange(index, "target", value)
                          }
                          placeholder="target…"
                          className="node-detail-select-target"
                          options={otherNodeIds.map((id) => ({
                            value: id,
                            label: id,
                          }))}
                        />
                        <Select
                          size="small"
                          value={link.type || undefined}
                          disabled={readOnly}
                          onChange={(value) =>
                            handleLinkChange(index, "type", value)
                          }
                          placeholder="type"
                          className="node-detail-input-sm"
                          options={EDGE_TYPE_ORDER.map((type) => ({
                            value: type,
                            label: type,
                          }))}
                        />
                        <Input
                          size="small"
                          value={link.label}
                          disabled={readOnly}
                          onChange={(event) =>
                            handleLinkChange(index, "label", event.target.value)
                          }
                          placeholder="label"
                          className="node-detail-input-sm"
                        />
                        {!readOnly && (
                          <Button
                            size="small"
                            danger
                            type="text"
                            onClick={() => removeLink(index)}
                          >
                            ×
                          </Button>
                        )}
                      </Space>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        </section>

        {!readOnly && (
          <div className="node-detail-actions-end">
            <Button size="small" type="primary" onClick={handleSave}>
              Save
            </Button>
          </div>
        )}
      </Space>
    </Drawer>
  );
}
