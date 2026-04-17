import { FormEvent, useState } from "react";
import { Box, Button, FormControl, FormErrorMessage, Textarea, VStack } from "@chakra-ui/react";

interface Props {
  onLoad: (rawText: string) => Promise<void> | void;
  initialText?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export default function InlineGraphLoader({
  onLoad,
  initialText = "",
  isLoading = false,
  errorMessage,
}: Props) {
  const [rawText, setRawText] = useState(initialText);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLoad(rawText);
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack align="stretch" spacing={3}>
      <FormControl isInvalid={Boolean(errorMessage)}>
        <Textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="粘贴 graph.json 内容（JSON 数组）"
          aria-label="Paste graph.json"
          minH="160px"
          fontFamily="mono"
          fontSize="xs"
        />
        {errorMessage ? <FormErrorMessage>{errorMessage}</FormErrorMessage> : null}
      </FormControl>
        <Button variant="outline" type="submit" isLoading={isLoading} loadingText="加载中…">
          {isLoading ? "加载中…" : "加载图"}
        </Button>
      </VStack>
    </Box>
  );
}
