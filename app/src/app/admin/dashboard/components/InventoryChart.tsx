'use client';

import { Flex, Text } from '@chakra-ui/react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}-${m}`;
}

export function InventoryChart({ data }: { data: DataPoint[] }) {
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
      <LineChart data={formatted} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v}$`} tick={{ fontSize: 11 }} width={60} />
        <Tooltip
          formatter={(v) => [typeof v === 'number' ? `${v.toFixed(2)}$` : v, 'Valeur']}
          labelStyle={{ fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3182ce"
          strokeWidth={2}
          dot={data.length < 30}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
