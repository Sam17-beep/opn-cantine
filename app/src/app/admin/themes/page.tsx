'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  NativeSelect,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  THEMES,
  getThemeDefinition,
  isThemeId,
  type ThemeId,
} from '@/lib/domain/theme';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemesPage() {
  const { theme, loaded, saving, error, refresh, saveTheme } = useTheme();
  const [selection, setSelection] = useState<ThemeId | null>(null);
  const [saved, setSaved] = useState(false);
  const selected = selection ?? theme;
  const selectedTheme = getThemeDefinition(selected);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    if (await saveTheme(selected)) {
      setSelection(null);
      setSaved(true);
    }
  }

  return (
    <Box maxW="720px" mx="auto" px={{ base: 5, md: 8 }} py={10}>
      <Heading size="3xl" mb={3}>
        Thèmes
      </Heading>
      <Text color="fg.muted" mb={8}>
        Une touche de fantaisie pour toute la cantine. Le thème choisi
        s’applique à tous les écrans et à tous les appareils.
      </Text>
      <form onSubmit={handleSave}>
        <VStack align="stretch" gap={5}>
          <Box>
            <label htmlFor="app-theme">
              <Text as="span" fontWeight="600" display="block" mb={2}>
                Thème de l’application
              </Text>
            </label>
            <NativeSelect.Root size="lg" disabled={!loaded || saving}>
              <NativeSelect.Field
                id="app-theme"
                value={selected}
                aria-describedby="theme-description"
                onChange={event => {
                  if (isThemeId(event.target.value)) {
                    setSelection(event.target.value);
                    setSaved(false);
                  }
                }}
              >
                {THEMES.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
          <Box
            className="theme-preview"
            data-preview-theme={selected}
            p={6}
            borderWidth="1px"
            borderRadius="xl"
          >
            {selected !== 'classic' ? (
              <Box className="theme-preview-scenery" aria-hidden="true" />
            ) : (
              <Text fontSize="3xl" aria-hidden="true" mb={2}>
                ☕
              </Text>
            )}
            <Text fontWeight="700" fontSize="xl" mb={2}>
              {selected === 'classic'
                ? 'Bienvenue à la cantine'
                : selectedTheme.label}
            </Text>
            <Text id="theme-description">{selectedTheme.description}</Text>
          </Box>
          {!loaded && !error && <Text role="status">Chargement du thème…</Text>}
          {error && (
            <Box role="alert">
              <Text color="fg.error" mb={2}>
                {error}
              </Text>
              <Button
                variant="outline"
                onClick={() => void refresh()}
                disabled={saving}
              >
                Réessayer la synchronisation
              </Button>
            </Box>
          )}
          {saved && !error && (
            <Text role="status" color="fg.success">
              Thème enregistré. Les autres appareils se mettent à jour en moins
              d’une minute lorsqu’ils sont en ligne.
            </Text>
          )}
          <Button
            type="submit"
            size="lg"
            loading={saving}
            disabled={!loaded || saving || selected === theme}
          >
            Appliquer le thème
          </Button>
          <Text color="fg.muted" fontSize="sm">
            Choisissez Classique pour retrouver l’apparence habituelle. Les
            prix, les achats et les annonces restent inchangés.
          </Text>
        </VStack>
      </form>
    </Box>
  );
}
