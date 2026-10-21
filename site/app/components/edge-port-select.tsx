import type { ConnectionSide } from "@/original-ui/domain/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EdgePortSelect({ label, value, onChange }: {
  label: string; value?: ConnectionSide | null; onChange: (value: ConnectionSide | null) => void;
}) {
  return <div className="grid gap-2">
    <Label>{label}</Label>
    <Select value={value ?? "auto"} onValueChange={(next) => onChange(next === "auto" ? null : next as ConnectionSide)}>
      <SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">自动</SelectItem>
        <SelectItem value="top">上侧</SelectItem>
        <SelectItem value="right">右侧</SelectItem>
        <SelectItem value="bottom">下侧</SelectItem>
        <SelectItem value="left">左侧</SelectItem>
      </SelectContent>
    </Select>
  </div>;
}
