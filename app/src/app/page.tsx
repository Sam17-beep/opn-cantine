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

const CARD_CODE_LENGTH = 12;

type Employee = {
  employeeNumber: string;
  fullName: string;
  tab: number;
};

export default function Home() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const router = useRouter();

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3000);
  }, []);

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
    const value = (number ?? employeeNumber).trim();
    if (submittingRef.current) return;

    if (!value) {
      setError('Veuillez entrer un numéro.');
      return;
    }

    if (value.length !== CARD_CODE_LENGTH) {
      showToast('Code incomplet. Veuillez rescanner votre carte.');
      setEmployeeNumber('');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/employees/lookup?employeeNumber=${encodeURIComponent(value)}`
      );

      if (!res.ok) {
        setError('Erreur du serveur. Réessayez.');
        return;
      }

      const data = await res.json();

      if (data.found) {
        router.push(`/tab/${encodeURIComponent(value)}`);
      } else {
        router.push(
          `/register?employeeNumber=${encodeURIComponent(value)}`
        );
      }
    } catch {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [employeeNumber, router, showToast]);

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
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  }, []);

  return (
    <>
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

      {!isSearchMode ? (
        <>
          {/* Hidden input to capture card reader scan */}
          <Input
            ref={inputRef}
            value={employeeNumber}
            onBlur={() => {
              if (!isSearchMode) inputRef.current?.focus();
            }}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              setEmployeeNumber(val);
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
                key={emp.employeeNumber}
                variant="outline"
                size="lg"
                justifyContent="flex-start"
                onClick={() => router.push(`/tab/${encodeURIComponent(emp.employeeNumber)}`)}
              >
                {emp.fullName}
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
              setEmployeeNumber('');
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
