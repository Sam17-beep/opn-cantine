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
import { StatCard } from './components/StatCard';
import { RankedListCard } from './components/RankedListCard';

interface AnalyticsData {
  transactionsByDay: {
    date: string;
    count: number;
    amount: number;
    products?: number;
    tickets?: number;
    coffee?: number;
    other?: number;
  }[];
  tabHistory: { date: string; cumulative: number }[];
  inventoryHistory: { date: string; value: number }[];
  totalUnpaidTabs: number;
  weeklyRevenue: {
    average: number;
    weeksCounted: number;
    partial: boolean;
  };
  revenueSplit: { products: number; tickets: number; coffee: number; other: number };
  averageBasket: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  ticketRevenueByEvent: { eventId: string; title: string; qty: number; revenue: number }[];
}

const EMPTY_WEEKLY_REVENUE: AnalyticsData['weeklyRevenue'] = {
  average: 0,
  weeksCounted: 0,
  partial: false,
};

// A cached response from an older build may predate these fields; the kiosk is
// a PWA, so tolerate it instead of blanking the dashboard.
const PAYLOAD_DEFAULTS: Pick<
  AnalyticsData,
  'weeklyRevenue' | 'revenueSplit' | 'averageBasket' | 'topProducts' | 'ticketRevenueByEvent'
> = {
  weeklyRevenue: EMPTY_WEEKLY_REVENUE,
  revenueSplit: { products: 0, tickets: 0, coffee: 0, other: 0 },
  averageBasket: 0,
  topProducts: [],
  ticketRevenueByEvent: [],
};

function money(value: number): string {
  return `${value.toFixed(2)}$`;
}

function weeklyRevenueHint(weeklyRevenue: AnalyticsData['weeklyRevenue']): string {
  const { weeksCounted, partial } = weeklyRevenue;
  if (weeksCounted === 0) return 'Aucune vente enregistrée';
  if (partial) return 'Semaine en cours, encore incomplète';
  return `Moyenne sur ${weeksCounted} semaine${weeksCounted > 1 ? 's' : ''} complète${
    weeksCounted > 1 ? 's' : ''
  }`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return setData(null);
        const filled = { ...json };
        for (const [key, fallback] of Object.entries(PAYLOAD_DEFAULTS)) {
          filled[key] ??= fallback;
        }
        setData(filled);
      })
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
          <StatCard
            label="Total des ardoises impayées"
            value={money(data.totalUnpaidTabs)}
          />
          <StatCard
            label="Revenu moyen par semaine"
            value={money(data.weeklyRevenue.average)}
            hint={weeklyRevenueHint(data.weeklyRevenue)}
          />
          <Box
            gridColumn={{ base: '1', lg: '1 / -1' }}
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }}
            gap={6}
          >
            <StatCard label="Revenu produits" value={money(data.revenueSplit.products)} hint="Depuis le début" />
            <StatCard label="Revenu billets" value={money(data.revenueSplit.tickets)} hint="Depuis le début" />
            <StatCard
              label="Revenu café"
              value={money(data.revenueSplit.coffee)}
              hint={data.revenueSplit.other > 0 ? `Autre : ${money(data.revenueSplit.other)}` : 'Depuis le début'}
            />
            <StatCard label="Panier moyen" value={money(data.averageBasket)} hint="Par transaction" />
          </Box>
          <Box gridColumn={{ base: '1', lg: '1 / -1' }}>
            <ChartCard title="Ventes par jour">
              <TransactionsByDayChart data={data.transactionsByDay} />
            </ChartCard>
          </Box>
          <RankedListCard
            title="Top 5 produits (30 derniers jours)"
            qtyLabel="vendus"
            rows={data.topProducts.map((p, i) => ({ key: `${i}-${p.name}`, ...p }))}
          />
          <RankedListCard
            title="Revenu des billets par événement"
            qtyLabel="billets"
            rows={data.ticketRevenueByEvent.map((e) => ({ key: e.eventId, name: e.title, qty: e.qty, revenue: e.revenue }))}
          />
        </Box>
      )}
    </Flex>
  );
}
