'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Text,
} from '@chakra-ui/react';

type Urgency = 'critical' | 'warning' | 'ok' | 'unknown';

interface ProductRestock {
  productId: string;
  name: string;
  currentQty: number;
  price: number;
  totalUnitsSold: number;
  avgUnitsPerWeek: number;
  weeksRemaining: number | null;
  urgency: Urgency;
}

interface RestockData {
  products: ProductRestock[];
  summary: { critical: number; warning: number; ok: number; unknown: number };
}

const URGENCY_CONFIG: Record<Urgency, { label: string; dot: string; pillBg: string; pillColor: string }> = {
  critical: { label: 'Critique', dot: '🔴', pillBg: 'red.500', pillColor: 'white' },
  warning:  { label: 'Attention', dot: '🟡', pillBg: 'yellow.400', pillColor: 'gray.800' },
  ok:       { label: 'OK', dot: '🟢', pillBg: 'green.500', pillColor: 'white' },
  unknown:  { label: 'Inconnu', dot: '⚪', pillBg: 'bg.subtle', pillColor: 'fg.muted' },
};

function weeksLabel(p: ProductRestock): string {
  if (p.currentQty === 0) return 'Rupture';
  if (p.weeksRemaining === null) return '—';
  if (p.weeksRemaining === 0) return '< 1 semaine';
  if (p.weeksRemaining === 1) return '1 semaine';
  return `${p.weeksRemaining} semaines`;
}

function WeeksPill({ product }: { product: ProductRestock }) {
  const cfg = URGENCY_CONFIG[product.urgency];
  return (
    <Box
      px={3}
      py={1}
      borderRadius="full"
      bg={cfg.pillBg}
      color={cfg.pillColor}
      fontSize="sm"
      fontWeight="700"
      display="inline-block"
      whiteSpace="nowrap"
    >
      {weeksLabel(product)}
    </Box>
  );
}

function UrgencySection({ urgency, products }: { urgency: Urgency; products: ProductRestock[] }) {
  if (products.length === 0) return null;
  const cfg = URGENCY_CONFIG[urgency];

  return (
    <Box w="full" mt={6}>
      <Flex align="center" gap={2} mb={2}>
        <Text fontSize="md" fontWeight="700">{cfg.dot} {cfg.label}</Text>
        <Text fontSize="sm" color="fg.muted">({products.length})</Text>
      </Flex>
      <Flex w="full" py={2} px={4} borderBottom="2px solid" borderColor="border">
        <Text flex={3} fontSize="sm" fontWeight="700" color="fg.muted">Produit</Text>
        <Text flex={1} fontSize="sm" fontWeight="700" color="fg.muted" textAlign="right">Stock</Text>
        <Text flex={1.5} fontSize="sm" fontWeight="700" color="fg.muted" textAlign="right">Ventes/semaine</Text>
        <Text flex={2} fontSize="sm" fontWeight="700" color="fg.muted" textAlign="right">Semaines restantes</Text>
      </Flex>
      {products.map((p) => (
        <Flex
          key={p.productId}
          w="full"
          py={4}
          px={4}
          borderBottom="1px solid"
          borderColor="border.muted"
          align="center"
          _hover={{ bg: 'bg.subtle' }}
        >
          <Text flex={3} fontWeight="600" fontSize={{ base: 'md', md: 'lg' }}>{p.name}</Text>
          <Text
            flex={1}
            fontWeight="700"
            fontSize={{ base: 'md', md: 'lg' }}
            textAlign="right"
            color={p.currentQty === 0 ? 'red.500' : p.currentQty < 5 ? 'yellow.500' : undefined}
          >
            {p.currentQty}
          </Text>
          <Text flex={1.5} fontSize={{ base: 'sm', md: 'md' }} color="fg.muted" textAlign="right">
            {p.avgUnitsPerWeek > 0 ? `${p.avgUnitsPerWeek}/semaine` : '—'}
          </Text>
          <Flex flex={2} justify="flex-end">
            <WeeksPill product={p} />
          </Flex>
        </Flex>
      ))}
    </Box>
  );
}

export default function RestockPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RestockData | null>(null);

  useEffect(() => {
    fetch('/api/analytics/restock')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  const groupedProducts = (urgency: Urgency) =>
    data?.products.filter((p) => p.urgency === urgency) ?? [];

  return (
    <Flex direction="column" px={8} py={6} pb={8}>
      {loading ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">Chargement...</Text>
        </Flex>
      ) : !data ? (
        <Flex justify="center" py={20}>
          <Text color="red.500" fontSize="lg">Erreur de chargement.</Text>
        </Flex>
      ) : (
        <>
          {/* Summary bar */}
          <Flex py={5} px={6} borderRadius="xl" bg="bg.subtle" gap={6} align="center" flexWrap="wrap">
            {data.summary.critical > 0 && (
              <Text fontWeight="700" color="red.500" fontSize={{ base: 'md', md: 'lg' }}>
                🔴 {data.summary.critical} critique{data.summary.critical > 1 ? 's' : ''}
              </Text>
            )}
            {data.summary.warning > 0 && (
              <Text fontWeight="700" color="yellow.600" fontSize={{ base: 'md', md: 'lg' }}>
                🟡 {data.summary.warning} en attention
              </Text>
            )}
            {data.summary.ok > 0 && (
              <Text fontWeight="600" color="green.600" fontSize={{ base: 'md', md: 'lg' }}>
                🟢 {data.summary.ok} OK
              </Text>
            )}
            {data.summary.critical === 0 && data.summary.warning === 0 && (
              <Text fontWeight="600" color="green.600" fontSize={{ base: 'md', md: 'lg' }}>
                Tous les stocks sont suffisants ✓
              </Text>
            )}
            {data.summary.unknown > 0 && (
              <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
                ⚪ {data.summary.unknown} sans données de vente
              </Text>
            )}
          </Flex>

          <UrgencySection urgency="critical" products={groupedProducts('critical')} />
          <UrgencySection urgency="warning"  products={groupedProducts('warning')} />
          <UrgencySection urgency="ok"       products={groupedProducts('ok')} />
          <UrgencySection urgency="unknown"  products={groupedProducts('unknown')} />
        </>
      )}
    </Flex>
  );
}
