'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { putCachedEmployee, searchCachedEmployees } from '@/lib/infrastructure/offline/lookupCache';
import { useOnlineStatus } from '@/lib/infrastructure/offline/connectivity';
import { getPendingSales, QUEUED_SALE_TOAST_KEY } from '@/lib/infrastructure/offline/saleQueue';

const CARD_CODE_LENGTH = 12;

type Employee = {
  cardNumber: string;
  employeeNumber: string;
  tab: number;
};

type AnnouncementEvent = {
  title: string;
  description: string;
  bannerStart?: string | null;
  bannerEnd?: string | null;
};

type Announcement = {
  title: string;
  description: string;
};

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isBannerVisible(event: AnnouncementEvent): boolean {
  const today = localDateString();
  return !!event.bannerStart && today >= event.bannerStart &&
    (!event.bannerEnd || today <= event.bannerEnd);
}

export default function Home() {
  const [cardNumber, setCardNumber] = useState('');
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [pendingSaleCount, setPendingSaleCount] = useState(0);
  const router = useRouter();
  const { isOnline } = useOnlineStatus();

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const showInfo = useCallback((msg: string) => {
    if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    setInfoMsg(msg);
    infoTimerRef.current = setTimeout(() => setInfoMsg(''), 4000);
  }, []);

  // Surface the "saved offline" confirmation left by useSaveFlow after a queued sale,
  // and keep the pending-sync count visible so unsynced data is never silently invisible.
  useEffect(() => {
    if (sessionStorage.getItem(QUEUED_SALE_TOAST_KEY)) {
      sessionStorage.removeItem(QUEUED_SALE_TOAST_KEY);
      showInfo('Vente enregistrée localement — sera synchronisée');
    }

    const refreshPendingCount = () => {
      getPendingSales().then((sales) => setPendingSaleCount(sales.length));
    };
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, [showInfo]);

  // Keep the hidden input focused at all times when not in search mode
  useEffect(() => {
    const refocus = () => {
      if (!isSearchMode) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('click', refocus);
    document.addEventListener('touchstart', refocus);
    return () => {
      document.removeEventListener('click', refocus);
      document.removeEventListener('touchstart', refocus);
    };
  }, [isSearchMode]);

  const handleSubmit = useCallback(async (number?: string) => {
    const value = (number ?? cardNumber).trim();
    if (submittingRef.current) return;

    if (!value) {
      setError('Veuillez entrer un numéro.');
      return;
    }

    if (value.length !== CARD_CODE_LENGTH) {
      showToast('Code incomplet. Veuillez rescanner votre carte.');
      setCardNumber('');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/employees/lookup?cardNumber=${encodeURIComponent(value)}`
      );

      if (!res.ok) {
        setError('Erreur du serveur. Réessayez.');
        return;
      }

      const data = await res.json();

      if (data.found) {
        await putCachedEmployee(data.employee);
        router.push(`/tab/${encodeURIComponent(value)}`);
      } else {
        router.push(
          `/register?cardNumber=${encodeURIComponent(value)}`
        );
      }
    } catch {
      // Network truly failed (most likely offline) — accept any well-formed card scan
      // rather than blocking the cashier just because this kiosk hasn't personally seen
      // it before. Identity is verified for real once the sale syncs back online; refusing
      // a legitimate buyer here would defeat the point of staying open during an outage.
      // Deliberately distinct from the `found: false` branch above, which only triggers
      // when the server actually answered "no such card."
      router.push(`/tab/${encodeURIComponent(value)}`);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [cardNumber, router, showToast]);

  useEffect(() => {
    fetch('/api/announcement')
      .then((res) => res.ok ? res.json() : null)
      .then((data: AnnouncementEvent | null) => { if (data && isBannerVisible(data)) setAnnouncement({ title: data.title, description: data.description }); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    };
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch {
      // Offline — fall back to whatever this kiosk has cached locally (fine at ~100
      // employees scale) instead of leaving the search dead.
      const cached = await searchCachedEmployees(q.trim());
      setSearchResults(cached.map((e) => ({ ...e, tab: 0 })));
    }
  }, []);

  return (
    <>
      {!isOnline && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bg="orange.500"
          color="white"
          py={2}
          textAlign="center"
          fontSize="sm"
          fontWeight="600"
          zIndex={10000}
        >
          Hors ligne — fonctionnement limité
        </Box>
      )}

      {toastMsg && (
        <Box
          position="fixed"
          top={6}
          left="50%"
          transform="translateX(-50%)"
          bg="red.500"
          color="white"
          px={6}
          py={3}
          borderRadius="md"
          fontSize="md"
          fontWeight="medium"
          zIndex={9999}
          shadow="lg"
        >
          {toastMsg}
        </Box>
      )}

      {infoMsg && (
        <Box
          position="fixed"
          top={6}
          left="50%"
          transform="translateX(-50%)"
          bg="gray.700"
          color="white"
          px={6}
          py={3}
          borderRadius="md"
          fontSize="md"
          fontWeight="medium"
          zIndex={9999}
          shadow="lg"
        >
          {infoMsg}
        </Box>
      )}

      {pendingSaleCount > 0 && (
        <Box
          position="fixed"
          bottom={6}
          left={6}
          bg="gray.700"
          color="white"
          px={4}
          py={2}
          borderRadius="md"
          fontSize="sm"
          fontWeight="medium"
          zIndex={9999}
          shadow="lg"
        >
          {pendingSaleCount} vente{pendingSaleCount > 1 ? 's' : ''} en attente de synchronisation
        </Box>
      )}
    <Flex
      minH="100dvh"
      align="center"
      justify="center"
      position="relative"
      px={8}
      py={10}
      direction="column"
      gap={10}
    >
      <Box position="absolute" top={4} left={4}>
        <Image src="/bell.png" alt="Bell" width={64} height={64} priority />
      </Box>

      <VStack gap={2}>
        <Heading
          size={{ base: '4xl', md: '6xl' }}
          fontWeight="800"
          letterSpacing="-0.02em"
        >
          Cantine
        </Heading>
        <Text color="fg.muted" fontSize={{ base: 'lg', md: 'xl' }}>
          {isSearchMode ? "Recherchez votre numéro d'employé" : 'Scannez votre carte'}
        </Text>
      </VStack>

      {announcement && (
        <Box
          w="full"
          maxW="480px"
          px={6}
          py={5}
          borderRadius="2xl"
          bg="#0068A2"
          textAlign="center"
        >
          <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="800" mb={1} color="white">
            {announcement.title}
          </Text>
          <Text fontSize={{ base: 'md', md: 'lg' }} color="whiteAlpha.800">
            {announcement.description}
          </Text>
        </Box>
      )}

      {!isSearchMode ? (
        <>
          {/* Hidden input to capture card reader scan */}
          <Input
            ref={inputRef}
            value={cardNumber}
            onBlur={() => {
              if (!isSearchMode) inputRef.current?.focus();
            }}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              setCardNumber(val);
              setError('');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
            position="absolute"
            opacity={0}
            h={0}
            w={0}
            overflow="hidden"
            inputMode="none"
            autoFocus
          />

          {error && (
            <Text color="red.500" fontSize="lg">
              {error}
            </Text>
          )}

          {loading && (
            <Text color="fg.muted" fontSize="lg">
              Chargement...
            </Text>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsSearchMode(true)}
          >
            J&apos;ai oublié ma carte
          </Button>
        </>
      ) : (
        <VStack w="full" maxW="md" gap={4}>
          <Input
            placeholder="Tapez votre numéro d'employé..."
            size="lg"
            value={searchQuery}
            autoFocus
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              
              if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
              }
              
              searchDebounceTimerRef.current = setTimeout(() => {
                handleSearch(val);
              }, 300);
            }}
          />

          <VStack w="full" align="stretch" maxH="300px" overflowY="auto" gap={2}>
            {searchResults.map((emp) => (
              <Button
                key={emp.cardNumber}
                variant="outline"
                size="lg"
                justifyContent="flex-start"
                onClick={() => router.push(`/tab/${encodeURIComponent(emp.cardNumber)}`)}
              >
                {emp.employeeNumber}
              </Button>
            ))}
            {searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <Text color="fg.muted" textAlign="center" py={4}>
                Aucun résultat.
              </Text>
            )}
          </VStack>

          <Button
            variant="ghost"
            onClick={() => {
              setIsSearchMode(false);
              setSearchQuery('');
              setSearchResults([]);
              setCardNumber('');
              setError('');
            }}
          >
            Retour
          </Button>
        </VStack>
      )}

      <Button
        variant="ghost"
        size="sm"
        color="fg.muted"
        fontSize="md"
        position="absolute"
        bottom={6}
        right={6}
        onClick={() => router.push('/admin')}
      >
        Administration
      </Button>
    </Flex>
    </>
  );
}
