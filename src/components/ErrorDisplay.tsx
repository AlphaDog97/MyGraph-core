import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, Code, VStack } from "@chakra-ui/react";

interface Props {
  error: string;
}

export default function ErrorDisplay({ error }: Props) {
  return (
    <VStack h="100%" justify="center" p={6}>
      <Alert status="error" maxW="720px" borderRadius="md" alignItems="start">
        <AlertIcon />
        <Box>
          <AlertTitle>Dataset validation failed</AlertTitle>
          <AlertDescription whiteSpace="pre-wrap" mt={2}>
            {error}
          </AlertDescription>
          <AlertDescription mt={2}>
            Check your files in <Code>graph-data/nodes/</Code> and redeploy.
          </AlertDescription>
        </Box>
      </Alert>
    </VStack>
  );
}
