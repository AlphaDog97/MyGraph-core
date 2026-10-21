"use client";

import {
  DeleteOutlined,
  EditOutlined,
  BgColorsOutlined,
  ImportOutlined,
  GithubOutlined,
  LogoutOutlined,
  MoreOutlined,
  PlusOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Space, Typography, type MenuProps } from "antd";
import type { SignedInUser } from "@/app/lib/auth";
import type { CategorySummary, GraphSummary } from "@/app/lib/types";
import type { DeleteTarget, EntityDialogState } from "./use-original-workspace";

interface WorkspaceActionsProps {
  category?: CategorySummary;
  graph?: GraphSummary;
  onOpenEntity: (state: EntityDialogState) => void;
  onDelete: (target: DeleteTarget) => void;
  canCreateNode: boolean;
  onCreateNode: () => void;
  onImport: () => void;
  onEditColors: () => void;
}

export function WorkspaceActions({
  category,
  graph,
  onOpenEntity,
  onDelete,
  canCreateNode,
  onCreateNode,
  onImport,
  onEditColors,
}: WorkspaceActionsProps) {
  const items: MenuProps["items"] = [
    { key: "import", icon: <ImportOutlined />, label: "导入图谱 JSON", onClick: onImport },
    {
      key: "new-node", icon: <PlusOutlined />, label: "新建节点",
      disabled: !canCreateNode, title: canCreateNode ? undefined : "请在分类图中选择具体图谱",
      onClick: onCreateNode,
    },
    {
      key: "new-category",
      icon: <PlusOutlined />,
      label: "新建分类",
      onClick: () => onOpenEntity({ kind: "category", mode: "create" }),
    },
    {
      key: "new-graph",
      icon: <PlusOutlined />,
      label: "新建图谱",
      disabled: !category,
      onClick: () =>
        onOpenEntity({
          kind: "graph",
          mode: "create",
          categoryId: category?.id,
        }),
    },
    { type: "divider" },
    {
      key: "manage", icon: <SettingOutlined />, label: "管理当前内容",
      children: [
        {
          key: "edit-category", icon: <EditOutlined />, label: "编辑当前分类",
          disabled: !category,
          onClick: () => category && onOpenEntity({ kind: "category", mode: "edit", item: category }),
        },
        {
          key: "edit-graph", icon: <EditOutlined />, label: "编辑当前图谱",
          disabled: !graph,
          onClick: () => graph && onOpenEntity({ kind: "graph", mode: "edit", item: graph }),
        },
        { type: "divider" },
        {
          key: "delete-graph", icon: <DeleteOutlined />, label: "删除当前图谱",
          danger: true, disabled: !graph,
          onClick: () => graph && onDelete({ kind: "graph", item: graph }),
        },
        {
          key: "delete-category", icon: <DeleteOutlined />, label: "删除当前分类",
          danger: true, disabled: !category,
          onClick: () => category && onDelete({ kind: "category", item: category }),
        },
      ],
    },
    { key: "colors", icon: <BgColorsOutlined />, label: "标签配色", onClick: onEditColors },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight"
      overlayClassName="workspace-toolbar-menu">
      <Button
        icon={<MoreOutlined />}
        aria-label="打开图谱操作菜单"
        className="workspace-toolbar__menu-button"
      ><span className="workspace-toolbar__menu-label">操作</span></Button>
    </Dropdown>
  );
}

export function OriginalUserMenu({ user }: { user: SignedInUser }) {
  const items: MenuProps["items"] = [
    {
      key: "profile",
      disabled: true,
      label: (
        <Space direction="vertical" size={0} className="original-user-summary">
          <Typography.Text strong>{user.displayName}</Typography.Text>
          <Typography.Text type="secondary">{user.email}</Typography.Text>
        </Space>
      ),
    },
    { type: "divider" },
    {
      key: "github", icon: <GithubOutlined />,
      label: <a href="https://github.com/AlphaDog97/MyGraph-core" target="_blank" rel="noopener noreferrer">GitHub 项目</a>,
    },
    {
      key: "signout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => {
        const form = document.createElement("form");
        form.method = "post";
        form.action = "/auth/signout";
        document.body.appendChild(form);
        form.submit();
      },
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <Button
        className="toolbar-user-button"
        icon={
          <Avatar
            size={24}
            src={user.avatarUrl ?? undefined}
            icon={<UserOutlined />}
          />
        }
        aria-label="打开账户菜单"
        title={user.displayName}
      />
    </Dropdown>
  );
}
