import { Select } from "antd";
import type { ConnectionSide } from "@/original-ui/domain/types";

const options = [
  { value: "auto", label: "自动" }, { value: "top", label: "上侧" },
  { value: "right", label: "右侧" }, { value: "bottom", label: "下侧" }, { value: "left", label: "左侧" },
];
export function EdgePortSelect({ label, value, onChange }: {
  label: string; value?: ConnectionSide | null; onChange: (value: ConnectionSide | null) => void;
}) {
  return <div className="edge-editor-port-field">
    <span>{label}</span>
    <Select aria-label={label} value={value ?? "auto"} options={options}
      onChange={next => onChange(next === "auto" ? null : next as ConnectionSide)} />
  </div>;
}
