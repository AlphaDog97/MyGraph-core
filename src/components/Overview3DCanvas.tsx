import { Card, Typography } from "antd";

interface Props {
  theme: "light" | "dark";
}

export default function Overview3DCanvas({ theme }: Props) {
  return (
    <div className="overview3d-root">
      <Card className="overview3d-card" bordered={theme === "light"}>
        <Typography.Title level={4}>3D 总览模式</Typography.Title>
        <Typography.Paragraph type="secondary">
          当前为第一版占位画布。后续可在这里接入真实 3D 总览渲染与交互能力。
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
