"use client";

import {
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Grid,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import type { GraphDetail, GraphEdge, GraphNode } from "@/app/lib/types";

interface SiteNodeDrawerProps {
  node: GraphNode;
  detail: GraphDetail;
  onClose: () => void;
  onEditNode: (node: GraphNode) => void;
  onDeleteNode: (node: GraphNode) => void;
  onCreateEdge: (sourceId: string) => void;
  onEditEdge: (edge: GraphEdge) => void;
  onDeleteEdge: (edge: GraphEdge) => void;
  onSelectNode: (node: GraphNode) => void;
}

export function SiteNodeDrawer({
  node,
  detail,
  onClose,
  onEditNode,
  onDeleteNode,
  onCreateEdge,
  onEditEdge,
  onDeleteEdge,
  onSelectNode,
}: SiteNodeDrawerProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const nodeById = new Map(detail.nodes.map((item) => [item.id, item]));
  const relations = detail.edges.filter(
    (edge) => edge.sourceNodeId === node.id || edge.targetNodeId === node.id,
  );

  return (
    <Drawer
      open
      title="Node details"
      onClose={onClose}
      mask={false}
      placement={isMobile ? "bottom" : "right"}
      width={isMobile ? undefined : "min(440px, 40vw)"}
      height={isMobile ? "100dvh" : undefined}
      zIndex={40}
      getContainer={false}
      rootClassName="node-detail-drawer"
      extra={
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditNode(node)}
          >
            编辑
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteNode(node)}
          />
        </Space>
      }
    >
      <Space direction="vertical" size={16} className="full-width node-detail-content">
        <section className="node-detail-section">
          <Typography.Title level={4} className="node-detail-heading">
            {node.label}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            {node.description || "暂无说明"}
          </Typography.Paragraph>
        </section>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Local ID">{node.nodeKey}</Descriptions.Item>
          {node.globalConceptId ? (
            <Descriptions.Item label="Global concept ID">
              <Typography.Text code>{node.globalConceptId}</Typography.Text>
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item label="Graph">{detail.graph.label}</Descriptions.Item>
        </Descriptions>

        <section className="node-detail-section">
          <Typography.Title level={5} className="node-detail-heading">
            Tags
          </Typography.Title>
          <Space size={[6, 6]} wrap>
            {node.tags.length ? (
              node.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
            ) : (
              <Typography.Text type="secondary">暂无标签</Typography.Text>
            )}
          </Space>
        </section>

        <Divider className="node-detail-divider" />

        <section className="node-detail-section">
          <div className="node-detail-section-heading">
            <Typography.Title level={5} className="node-detail-heading">
              Relations
            </Typography.Title>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onCreateEdge(node.id)}
            >
              Add relation
            </Button>
          </div>
          {relations.length ? (
            <List
              size="small"
              dataSource={relations}
              renderItem={(edge) => {
                const outbound = edge.sourceNodeId === node.id;
                const related = nodeById.get(
                  outbound ? edge.targetNodeId : edge.sourceNodeId,
                );
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEditEdge(edge)}
                      />,
                      <Button
                        key="delete"
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDeleteEdge(edge)}
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<LinkOutlined />}
                      title={
                        <Button
                          type="link"
                          size="small"
                          className="relation-node-link"
                          onClick={() => related && onSelectNode(related)}
                        >
                          {outbound ? "→" : "←"} {related?.label ?? "Unknown node"}
                        </Button>
                      }
                      description={`${edge.type}${edge.label ? ` · ${edge.label}` : ""}`}
                    />
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关系" />
          )}
        </section>
      </Space>
    </Drawer>
  );
}
