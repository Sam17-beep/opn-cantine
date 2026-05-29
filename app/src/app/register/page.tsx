'use client';

import { Button, Flex, Heading, Input, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

function RegisterForm() {
  const router = useRouter();

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

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNumber: employeeNumber.trim(),
          initialTab: parsedInitialTab,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push(`/tab/${encodeURIComponent(employeeNumber.trim())}`);
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
              // Allow only digits and a single decimal point with up to 2 decimal places
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
