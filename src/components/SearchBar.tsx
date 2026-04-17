import { useRef, useEffect } from "react";
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from "@chakra-ui/react";
import { SearchIcon, CloseIcon } from "@chakra-ui/icons";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onChange]);

  return (
    <InputGroup maxW="320px">
      <InputLeftElement pointerEvents="none">
        <SearchIcon color="gray.400" />
      </InputLeftElement>
      <Input
        ref={inputRef}
        placeholder='Search nodes… (press "/")'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="sm"
      />
      {value && (
        <InputRightElement>
          <IconButton
            size="xs"
            aria-label="Clear search"
            icon={<CloseIcon />}
            onClick={() => onChange("")}
          />
        </InputRightElement>
      )}
    </InputGroup>
  );
}
