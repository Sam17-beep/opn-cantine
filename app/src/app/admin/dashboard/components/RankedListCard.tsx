import { Box, Flex, Text } from '@chakra-ui/react';

export interface RankedRow {
  key: string;
  name: string;
  qty: number;
  revenue: number;
}

interface RankedListCardProps {
  title: string;
  rows: RankedRow[];
  /** Unit shown after the quantity, e.g. "vendus". */
  qtyLabel: string;
}

/** A titled list of name / quantity / revenue rows, used for top products and ticket sales. */
export function RankedListCard({ title, rows, qtyLabel }: RankedListCardProps) {
  return (
    <Box borderRadius="xl" border="1px solid" borderColor="border" p={6}>
      <Text fontWeight="700" fontSize="lg" mb={4}>
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text color="fg.muted">Aucune donnée</Text>
      ) : (
        <Flex direction="column" gap={2}>
          {rows.map((row, i) => (
            <Flex key={row.key} justify="space-between" gap={4}>
              <Text fontWeight="600" truncate>
                {i + 1}. {row.name}
              </Text>
              <Text color="fg.muted" whiteSpace="nowrap">
                {row.qty} {qtyLabel} · {row.revenue.toFixed(2)}$
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}
