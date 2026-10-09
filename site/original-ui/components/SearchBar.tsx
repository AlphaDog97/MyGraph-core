import { useEffect, useRef } from "react";
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
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== inputRef.current?.input) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (
        event.key === "Escape" &&
        document.activeElement === inputRef.current?.input
      ) {
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
      placeholder="Search this graph"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      size={size}
      className="toolbar-search"
      prefix={<SearchOutlined className="search-icon" />}
      suffix={
        value ? (
          <CloseCircleFilled
            role="button"
            tabIndex={0}
            aria-label="Clear search"
            onClick={() => onChange("")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onChange("");
            }}
            className="search-clear-icon"
          />
        ) : (
          <kbd className="search-shortcut" aria-label="Keyboard shortcut: slash">
            /
          </kbd>
        )
      }
    />
  );
}
