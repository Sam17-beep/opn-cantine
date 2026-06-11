'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';

type Urgency = 'critical' | 'warning' | 'ok' | 'unknown';

interface ProductRestock {
  productId: string;
  name: string;
  currentQty: number;
  price: number;
  totalUnitsSold: number;
  avgUnitsPerDay: number;
  daysRemaining: number | null;
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

function daysLabel(p: ProductRestock): string {
  if (p.currentQty === 0) return 'Rupture';
  if (p.daysRemaining === null) return '—';
  if (p.daysRemaining === 0) return '< 1 jour';
  if (p.daysRemaining === 1) return '1 jour';
  return `${p.daysRemaining} jours`;
}

function DaysPill({ product }: { product: ProductRestock }) {
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
      {daysLabel(product)}
    </Box>
  );
}

function UrgencySection({ urgency, products }: { urgency: Urgency; products: ProductRestock[] }) {
  if (products.length === 0) return null;
  const cfg = URGENCY_CONFIG[urgency];

  return (
    <Box w="full" mt={6}>
      <Flex align="center" gap={2} mb={2}>
        <Text fontSize="md" fontWeight="700">
          {cfg.dot} {cfg.label}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          ({products.length})
        </Text>
      </Flex>

      {/* Column header */}
      <Flex
        w="full"
        py={2}
        px={4}
        borderBottom="2px solid"
        borderColor="border"
      >
        <Text flex={3} fontSize="sm" fontWeight="700" color="fg.muted">Produit</Text>
        <Text flex={1} fontSize="sm" fontWeight="700" color="fg.muted" textAlign="right">Stock</Text>
        <Text flex={1.5} fontSize="sm" fontWeight="700" color="fg.muted" textAlign="right">Ventes/jour</Text>
        <Text flex={2} fontSize="sm" fontWeight="700" color="fg.muted" textAlign="right">Jours restants</Text>
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
          <Text flex={3} fontWeight="600" fontSize={{ base: 'md', md: 'lg' }}>
            {p.name}
          </Text>
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
            {p.avgUnitsPerDay > 0 ? `${p.avgUnitsPerDay}/jour` : '—'}
          </Text>
          <Flex flex={2} justify="flex-end">
            <DaysPill product={p} />
          </Flex>
        </Flex>
      ))}
    </Box>
  );
}

export default function RestockPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RestockData | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch('/api/admin/check')
      .then((res) => { if (res.ok) setAuthenticated(true); setCheckingAuth(false); })
      .catch(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch('/api/analytics/restock')
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
    if (d.valid) { setAuthenticated(true); } else { setPinError('NIP invalide.'); setPin(''); }
  };

  if (!mounted || checkingAuth) return <Flex minH="100dvh" />;

  if (!authenticated) {
    return (
      <Flex minH="100dvh" align="center" justify="center" px={8} direction="column" gap={6}>
        <Button variant="outline" size="lg" color="fg.muted" position="absolute" top={6} right={6} onClick={() => router.push('/admin')}>
          ← Administration
        </Button>
        <Heading size={{ base: '2xl', md: '4xl' }} fontWeight="800" letterSpacing="-0.02em">
          Réapprovisionnement
        </Heading>
        <Text color="fg.muted" fontSize={{ base: 'lg', md: 'xl' }}>Entrez le NIP</Text>
        <VStack gap={4} w="full" maxW="400px">
          <Input
            type="password" inputMode="numeric" placeholder="NIP" value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePin()}
            textAlign="center" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="600"
            letterSpacing="0.2em" py={10} h="auto" autoFocus
          />
          {pinError && <Text color="red.500" fontSize="lg">{pinError}</Text>}
          <Button w="full" h="auto" py={6} colorPalette="gray" onClick={handlePin} fontWeight="600" fontSize={{ base: 'xl', md: '2xl' }}>
            Continuer
          </Button>
        </VStack>
      </Flex>
    );
  }

  const groupedProducts = (urgency: Urgency) =>
    data?.products.filter((p) => p.urgency === urgency) ?? [];

  return (
    <Flex minH="100dvh" direction="column" px={8} py={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size={{ base: '2xl', md: '4xl' }} fontWeight="800" letterSpacing="-0.02em">
          Réapprovisionnement
        </Heading>
        <Button variant="outline" size="lg" color="fg.muted" onClick={() => router.push('/admin')}>
          ← Administration
        </Button>
      </Flex>

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
          <Flex
            py={5} px={6} borderRadius="xl" bg="bg.subtle"
            gap={6} align="center" flexWrap="wrap"
          >
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

          {/* Product sections */}
          <UrgencySection urgency="critical" products={groupedProducts('critical')} />
          <UrgencySection urgency="warning"  products={groupedProducts('warning')} />
          <UrgencySection urgency="ok"       products={groupedProducts('ok')} />
          <UrgencySection urgency="unknown"  products={groupedProducts('unknown')} />
        </>
      )}
    </Flex>
  );
}
