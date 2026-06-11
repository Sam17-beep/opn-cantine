'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { ChartCard } from './components/ChartCard';
import { InventoryChart } from './components/InventoryChart';
import { TabHistoryChart } from './components/TabHistoryChart';
import { TransactionsByDayChart } from './components/TransactionsByDayChart';

interface AnalyticsData {
  transactionsByDay: { date: string; count: number; amount: number }[];
  tabHistory: { date: string; cumulative: number }[];
  inventoryHistory: { date: string; value: number }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch('/api/admin/check')
      .then((res) => {
        if (res.ok) setAuthenticated(true);
        setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, [authenticated]);

  const handlePin = async () => {
    setPinError('');
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const d = await res.json();
    if (d.valid) {
      setAuthenticated(true);
    } else {
      setPinError('NIP invalide.');
      setPin('');
    }
  };

  if (!mounted || checkingAuth) {
    return <Flex minH="100dvh" />;
  }

  if (!authenticated) {
    return (
      <Flex
        minH="100dvh"
        align="center"
        justify="center"
        px={8}
        direction="column"
        gap={6}
      >
        <IconButton
          aria-label="Retour"
          variant="outline"
          size="lg"
          color="fg.muted"
          fontSize="xl"
          position="absolute"
          top={6}
          right={6}
          onClick={() => router.push('/admin')}
        >
          ✕
        </IconButton>

        <Heading
          size={{ base: '2xl', md: '4xl' }}
          fontWeight="800"
          letterSpacing="-0.02em"
        >
          Tableau de bord
        </Heading>
        <Text color="fg.muted" fontSize={{ base: 'lg', md: 'xl' }}>
          Entrez le NIP
        </Text>

        <VStack gap={4} w="full" maxW="400px">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="NIP"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setPinError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handlePin()}
            textAlign="center"
            fontSize={{ base: '3xl', md: '5xl' }}
            fontWeight="600"
            letterSpacing="0.2em"
            py={10}
            h="auto"
            autoFocus
          />
          {pinError && (
            <Text color="red.500" fontSize="lg">
              {pinError}
            </Text>
          )}
          <Button
            w="full"
            h="auto"
            py={6}
            colorPalette="gray"
            onClick={handlePin}
            fontWeight="600"
            fontSize={{ base: 'xl', md: '2xl' }}
          >
            Continuer
          </Button>
        </VStack>
      </Flex>
    );
  }

  return (
    <Flex minH="100dvh" direction="column" px={8} py={6}>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading
          size={{ base: '2xl', md: '4xl' }}
          fontWeight="800"
          letterSpacing="-0.02em"
        >
          Tableau de bord
        </Heading>
        <IconButton
          aria-label="Fermer"
          variant="outline"
          size="lg"
          color="fg.muted"
          fontSize="xl"
          onClick={() => router.push('/admin')}
        >
          ✕
        </IconButton>
      </Flex>

      {loading ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">
            Chargement...
          </Text>
        </Flex>
      ) : !data ? (
        <Flex justify="center" py={20}>
          <Text color="red.500" fontSize="lg">
            Erreur de chargement des données.
          </Text>
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
          <ChartCard title="Total des ardoises (cumulatif)">
            <TabHistoryChart data={data.tabHistory} />
          </ChartCard>
          <ChartCard title="Transactions par jour">
            <TransactionsByDayChart data={data.transactionsByDay} />
          </ChartCard>
        </Box>
      )}
    </Flex>
  );
}
