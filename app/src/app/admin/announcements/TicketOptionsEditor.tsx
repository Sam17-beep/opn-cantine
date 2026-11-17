'use client';

import { Box, Button, Flex, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react';
import { MAX_TICKET_OPTIONS, type TicketSaleErrors } from '@/lib/domain/ticket-options';

/** Editable ticket option. `id` is absent until the server assigns one. */
export interface DraftOption {
  key: string;
  id?: string;
  name: string;
  price: string;
  description: string;
}

let draftKeys = 0;
export function emptyDraftOption(): DraftOption {
  return { key: `draft-${++draftKeys}`, name: '', price: '', description: '' };
}

interface TicketOptionsEditorProps {
  options: DraftOption[];
  onChange: (options: DraftOption[]) => void;
  errors?: TicketSaleErrors['byOption'];
  listError?: string;
  /** Tickets already sold per option id, to warn before removing one. */
  soldByOption: Record<string, number>;
  removedWithSales: { name: string; sold: number }[];
  onRemoveWithSales: (removed: { name: string; sold: number }) => void;
}

const ErrorText = ({ children }: { children?: string }) =>
  children ? <Text fontSize="xs" color="red.500" mt={1} fontWeight="600">{children}</Text> : null;

export function TicketOptionsEditor({
  options,
  onChange,
  errors,
  listError,
  soldByOption,
  removedWithSales,
  onRemoveWithSales,
}: TicketOptionsEditorProps) {
  const update = (key: string, patch: Partial<DraftOption>) =>
    onChange(options.map((o) => (o.key === key ? { ...o, ...patch } : o)));

  const remove = (option: DraftOption) => {
    const sold = option.id ? soldByOption[option.id] ?? 0 : 0;
    if (sold > 0) onRemoveWithSales({ name: option.name, sold });
    onChange(options.filter((o) => o.key !== option.key));
  };

  return (
    <VStack align="stretch" gap={3}>
      <Box>
        <Text fontWeight="700" fontSize="sm">Options de billets</Text>
        <Text fontSize="xs" color="fg.muted">
          Une seule option : bouton d&apos;achat direct sur l&apos;ardoise. Plusieurs options : l&apos;employé
          choisit ses billets dans une fenêtre.
        </Text>
      </Box>

      {options.map((option, index) => {
        const fieldErrors = errors?.[index];
        const sold = option.id ? soldByOption[option.id] ?? 0 : 0;
        return (
          <Box
            key={option.key}
            p={3}
            borderRadius="lg"
            border="1px solid"
            borderColor={fieldErrors ? 'red.300' : 'border'}
            bg="bg.subtle"
          >
            <HStack gap={3} align="start">
              <Box flex={3}>
                <Input
                  aria-label={`Nom de l'option ${index + 1}`}
                  placeholder={index === 0 ? 'ex : Adulte' : 'ex : Enfant'}
                  value={option.name}
                  onChange={(e) => update(option.key, { name: e.target.value })}
                  fontSize="sm"
                  bg="bg"
                />
                <ErrorText>{fieldErrors?.name}</ErrorText>
              </Box>
              <Box flex={1}>
                <Input
                  aria-label={`Prix de l'option ${index + 1}`}
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="Prix $"
                  value={option.price}
                  onChange={(e) => update(option.key, { price: e.target.value })}
                  fontSize="sm"
                  bg="bg"
                />
                <ErrorText>{fieldErrors?.price}</ErrorText>
              </Box>
              <IconButton
                aria-label={`Retirer l'option ${index + 1}`}
                variant="ghost"
                size="sm"
                mt={1}
                color="fg.muted"
                _hover={{ color: 'red.500' }}
                onClick={() => remove(option)}
                disabled={options.length <= 1}
              >
                ✕
              </IconButton>
            </HStack>
            <Input
              mt={2}
              aria-label={`Description de l'option ${index + 1}`}
              placeholder="Description (optionnelle) — ex : Moins de 12 ans"
              value={option.description}
              onChange={(e) => update(option.key, { description: e.target.value })}
              fontSize="xs"
              size="sm"
              bg="bg"
            />
            <ErrorText>{fieldErrors?.description}</ErrorText>
            {sold > 0 && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {sold} billet{sold > 1 ? 's' : ''} déjà vendu{sold > 1 ? 's' : ''}
              </Text>
            )}
          </Box>
        );
      })}

      <ErrorText>{listError}</ErrorText>

      {removedWithSales.length > 0 && (
        <Box p={3} borderRadius="lg" bg="orange.subtle" fontSize="xs">
          {removedWithSales.map((r) => (
            <Text key={r.name}>
              « {r.name} » sera retirée : {r.sold} billet{r.sold > 1 ? 's' : ''} déjà vendu
              {r.sold > 1 ? 's' : ''} reste{r.sold > 1 ? 'nt' : ''} dans les statistiques.
            </Text>
          ))}
        </Box>
      )}

      {options.length < MAX_TICKET_OPTIONS && (
        <Flex>
          <Button
            variant="outline"
            borderStyle="dashed"
            size="sm"
            onClick={() => onChange([...options, emptyDraftOption()])}
          >
            + Ajouter une option
          </Button>
        </Flex>
      )}
    </VStack>
  );
}
