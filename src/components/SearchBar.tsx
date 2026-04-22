import { useRef, useEffect } from "react";
import { CloseCircleFilled, SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import type { InputRef } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  size?: SizeType;
}

export default function SearchBar({ value, onChange, size = "middle" }: Props) {
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current?.input) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current?.input) {
        onChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onChange]);

  return (
    <Input
      ref={inputRef}
      placeholder='Search nodes… (press "/")'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size={size}
      className="toolbar-search"
      prefix={<SearchOutlined style={{ color: "var(--color-search-icon)" }} />}
      suffix={
        value ? (
          <CloseCircleFilled
            onClick={() => onChange("")}
            style={{ color: "var(--color-search-icon)", cursor: "pointer" }}
          />
        ) : null
      }
    />
  );
}
