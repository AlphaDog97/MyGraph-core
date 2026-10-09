"use client";

import {
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
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
}

export function WorkspaceActions({
  category,
  graph,
  onOpenEntity,
  onDelete,
}: WorkspaceActionsProps) {
  const items: MenuProps["items"] = [
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
      key: "edit-category",
      icon: <EditOutlined />,
      label: "编辑当前分类",
      disabled: !category,
      onClick: () =>
        category &&
        onOpenEntity({ kind: "category", mode: "edit", item: category }),
    },
    {
      key: "edit-graph",
      icon: <EditOutlined />,
      label: "编辑当前图谱",
      disabled: !graph,
      onClick: () =>
        graph && onOpenEntity({ kind: "graph", mode: "edit", item: graph }),
    },
    { type: "divider" },
    {
      key: "delete-graph",
      icon: <DeleteOutlined />,
      label: "删除当前图谱",
      danger: true,
      disabled: !graph,
      onClick: () => graph && onDelete({ kind: "graph", item: graph }),
    },
    {
      key: "delete-category",
      icon: <DeleteOutlined />,
      label: "删除当前分类",
      danger: true,
      disabled: !category,
      onClick: () =>
        category && onDelete({ kind: "category", item: category }),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <Button
        icon={<SettingOutlined />}
        aria-label="管理分类和图谱"
        title="管理分类和图谱"
        className="toolbar-icon-button"
      />
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
