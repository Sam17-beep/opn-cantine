import { Box, Text } from '@chakra-ui/react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Box borderRadius="xl" border="1px solid" borderColor="border" p={6}>
      <Text fontWeight="700" fontSize="lg" mb={4}>
        {title}
      </Text>
      <Box h="300px">{children}</Box>
    </Box>
  );
}
