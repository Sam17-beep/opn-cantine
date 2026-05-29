'use client';

import { Button, Flex, Heading, Input, Text, VStack } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Card number from the URL (passed by the scanner on the main page). Used as
  // the DB identifier so future card scans can find this employee. Never shown.
  const cardNumber = searchParams.get('employeeNumber') || '';

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [initialTab, setInitialTab] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!employeeNumber.trim()) {
      setError("Le numéro d'employé est requis.");
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(employeeNumber.trim())) {
      setError("Le numéro d'employé ne doit contenir que des lettres et des chiffres.");
      return;
    }

    const parsedInitialTab = initialTab.trim() ? parseFloat(initialTab.trim()) : 0;
    if (isNaN(parsedInitialTab) || parsedInitialTab < 0) {
      setError('Le solde initial doit être un nombre positif.');
      return;
    }

    setLoading(true);
    setError('');

    // If a card number was passed via URL, use it as the DB identifier so the
    // card scanner can find this employee on future scans. The typed employee
    // number is stored as the display name. Without a card number (manual
    // registration), the typed employee number is used as both.
    const identifier = cardNumber || employeeNumber.trim();

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNumber: identifier,
          fullName: employeeNumber.trim(),
          initialTab: parsedInitialTab,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push(`/tab/${encodeURIComponent(identifier)}`);
    } catch {
      setError('Erreur de connexion. Réessayez.');
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100dvh"
      align="center"
      justify="center"
      px={8}
      py={10}
      direction="column"
      gap={10}
    >
      <VStack gap={2}>
        <Heading
          size={{ base: '3xl', md: '5xl' }}
          fontWeight="800"
          letterSpacing="-0.02em"
        >
          Nouveau compte
        </Heading>
        <Text color="fg.muted" fontSize={{ base: 'lg', md: 'xl' }}>
          Créez votre ardoise cantine
        </Text>
      </VStack>

      <VStack gap={8} w="full" maxW="600px">
        <VStack gap={2} w="full" align="start">
          <Text
            fontSize={{ base: 'md', md: 'lg' }}
            fontWeight="500"
            color="fg.muted"
          >
            Numéro d&apos;employé
          </Text>
          <Input
            placeholder="Ex: aa0000000"
            value={employeeNumber}
            onChange={e => {
              setEmployeeNumber(e.target.value);
              setError('');
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="500"
            py={8}
            h="auto"
          />
        </VStack>

        <VStack gap={2} w="full" align="start">
          <Text
            fontSize={{ base: 'md', md: 'lg' }}
            fontWeight="500"
            color="fg.muted"
          >
            Solde initial (optionnel)
          </Text>
          <Input
            placeholder="Ex: 12.50"
            inputMode="decimal"
            value={initialTab}
            onChange={e => {
              const val = e.target.value;
              if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
                setInitialTab(val);
                setError('');
              }
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="500"
            py={8}
            h="auto"
          />
        </VStack>

        {error && (
          <Text color="red.500" fontSize="lg">
            {error}
          </Text>
        )}

        <Button
          w="full"
          h="auto"
          py={6}
          colorPalette="gray"
          onClick={handleSubmit}
          loading={loading}
          fontWeight="600"
          fontSize={{ base: 'xl', md: '2xl' }}
        >
          Créer mon compte
        </Button>

        <Button
          w="full"
          variant="ghost"
          size="lg"
          color="fg.muted"
          fontSize="lg"
          onClick={() => router.push('/')}
        >
          Retour
        </Button>
      </VStack>
    </Flex>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
