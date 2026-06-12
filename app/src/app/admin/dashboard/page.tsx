'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Text,
} from '@chakra-ui/react';
import { ChartCard } from './components/ChartCard';
import { InventoryChart } from './components/InventoryChart';
import { TransactionsByDayChart } from './components/TransactionsByDayChart';

interface AnalyticsData {
  transactionsByDay: { date: string; count: number; amount: number }[];
  tabHistory: { date: string; cumulative: number }[];
  inventoryHistory: { date: string; value: number }[];
  totalUnpaidTabs: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Flex direction="column" px={8} py={6} pb={8}>
      {loading ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">Chargement...</Text>
        </Flex>
      ) : !data ? (
        <Flex justify="center" py={20}>
          <Text color="red.500" fontSize="lg">Erreur de chargement des données.</Text>
        </Flex>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
          gap={6}
        >
          <Box gridColumn={{ base: '1', lg: '1 / -1' }}>
            <ChartCard title="Valeur de l'inventaire">
              <InventoryChart data={data.inventoryHistory} />
            </ChartCard>
          </Box>
          <Box
            borderRadius="xl"
            border="1px solid"
            borderColor="border"
            p={6}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap={2}
          >
            <Text fontWeight="700" fontSize="lg" color="fg.muted">
              Total des ardoises impayées
            </Text>
            <Text fontWeight="800" fontSize={{ base: '4xl', md: '5xl' }}>
              {data.totalUnpaidTabs.toFixed(2)}$
            </Text>
          </Box>
          <ChartCard title="Transactions par jour">
            <TransactionsByDayChart data={data.transactionsByDay} />
          </ChartCard>
        </Box>
      )}
    </Flex>
  );
}
