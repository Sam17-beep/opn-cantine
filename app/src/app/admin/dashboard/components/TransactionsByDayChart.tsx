'use client';

import { Flex, Text } from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  date: string;
  count: number;
  amount: number;
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}-${m}`;
}

export function TransactionsByDayChart({ data }: { data: DataPoint[] }) {
  if (!data.length) {
    return (
      <Flex h="full" align="center" justify="center">
        <Text color="fg.muted">Aucune donnée</Text>
      </Flex>
    );
  }

  const formatted = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={formatted} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v, name) =>
            name === 'count'
              ? [v, 'Transactions']
              : [typeof v === 'number' ? `${v.toFixed(2)}$` : v, 'Montant']
          }
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar dataKey="count" fill="#805ad5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
