'use client';

import { useState } from 'react';
import { Button, Flex, Text } from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  date: string;
  count: number;
  amount: number;
  products?: number;
  tickets?: number;
  coffee?: number;
  other?: number;
}

const SERIES = [
  { key: 'products', label: 'Produits', color: '#3182ce' },
  { key: 'tickets', label: 'Billets', color: '#805ad5' },
  { key: 'coffee', label: 'Café', color: '#b7791f' },
  { key: 'other', label: 'Autre', color: '#a0aec0' },
] as const;

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}-${m}`;
}

export function TransactionsByDayChart({ data }: { data: DataPoint[] }) {
  // Ticket sales come in rare, large bursts that flatten everything else, so
  // they are opt-in.
  const [showTickets, setShowTickets] = useState(false);

  if (!data.length) {
    return (
      <Flex h="full" align="center" justify="center">
        <Text color="fg.muted">Aucune donnée</Text>
      </Flex>
    );
  }

  // Responses cached before the category split only carry `amount`.
  const formatted = data.map(d => ({
    ...d,
    label: formatDate(d.date),
    products: d.products ?? d.amount,
    tickets: d.tickets ?? 0,
    coffee: d.coffee ?? 0,
    other: d.other ?? 0,
  }));
  const hasTickets = formatted.some(d => d.tickets > 0);
  const series = SERIES.filter(
    s =>
      (s.key !== 'tickets' || showTickets) && formatted.some(d => d[s.key] > 0)
  );

  return (
    <Flex direction="column" h="full" gap={2}>
      {hasTickets ? (
        <Flex justify="flex-end">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setShowTickets(v => !v)}
          >
            {showTickets ? 'Masquer les billets' : 'Afficher les billets'}
          </Button>
        </Flex>
      ) : null}
      <Flex flex={1} minH={0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formatted}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={v => `${v}$`}
              tick={{ fontSize: 11 }}
              width={60}
            />
            <Tooltip
              formatter={(v, name) => [
                typeof v === 'number' ? `${v.toFixed(2)}$` : v,
                SERIES.find(s => s.key === name)?.label ?? name,
              ]}
              labelFormatter={(label, payload) => {
                const count = payload?.[0]?.payload?.count;
                return typeof count === 'number'
                  ? `${label} — ${count} transaction${count > 1 ? 's' : ''}`
                  : label;
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              formatter={name =>
                SERIES.find(s => s.key === name)?.label ?? name
              }
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="sales"
                fill={s.color}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Flex>
    </Flex>
  );
}
