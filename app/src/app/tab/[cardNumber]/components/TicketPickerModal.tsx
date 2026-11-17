'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
  VStack,
  DialogRoot,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogTitle,
} from '@chakra-ui/react';
import type { TicketOption } from '@/lib/domain/entities/announcement.entity';
import { remainingAllowance } from '@/lib/domain/ticket-options';

const ACCENT = '#0068A2';

export interface TicketPickerEvent {
  title: string;
  options: TicketOption[];
  maxPerEmployee?: number | null;
}

interface TicketPickerModalProps {
  open: boolean;
  event: TicketPickerEvent;
  /** Tickets already bought in past sales, total and per option id. */
  purchased: { total: number; byOption: Record<string, number> };
  /** Tickets of this event already sitting in the cart. */
  inCart: number;
  onClose: () => void;
  onConfirm: (quantities: Record<string, number>) => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function TicketPickerModal({ open, event, purchased, inCart, onClose, onConfirm }: TicketPickerModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) setQuantities({});
  }, [open]);

  const selected = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const subtotal = event.options.reduce((sum, o) => sum + o.price * (quantities[o.id] ?? 0), 0);
  const left = remainingAllowance(event.maxPerEmployee, purchased.total, inCart + selected);
  const limited = event.maxPerEmployee != null;

  const change = (optionId: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [optionId]: Math.max(0, (prev[optionId] ?? 0) + delta) }));

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => { if (!e.open) onClose(); }}
      placement="center"
      size="md"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent p={6}>
          <DialogHeader pb={4}>
            <VStack align="start" gap={0}>
              <DialogTitle fontSize="2xl" fontWeight="800">{event.title}</DialogTitle>
              <Text color="fg.muted">Choisissez vos billets</Text>
            </VStack>
          </DialogHeader>
          <DialogBody py={0}>
            <VStack gap={3} align="stretch" maxH="55vh" overflowY="auto">
              {event.options.map((option) => {
                const qty = quantities[option.id] ?? 0;
                const bought = purchased.byOption[option.id] ?? 0;
                return (
                  <Flex
                    key={option.id}
                    data-testid={`ticket-option-${option.id}`}
                    align="center"
                    gap={4}
                    p={4}
                    borderRadius="xl"
                    border="2px solid"
                    borderColor={qty > 0 ? ACCENT : 'border'}
                    bg={qty > 0 ? `${ACCENT}0D` : undefined}
                    _dark={{ borderColor: qty > 0 ? 'blue.300' : 'border' }}
                    transition="all 0.15s"
                  >
                    <Box flex={1} minW={0}>
                      <Text fontWeight="700" fontSize="lg">{option.name}</Text>
                      {option.description && (
                        <Text fontSize="sm" color="fg.muted">{option.description}</Text>
                      )}
                      <HStack gap={2} mt={1}>
                        <Text fontWeight="700" color={ACCENT} _dark={{ color: 'blue.300' }}>
                          {option.price.toFixed(2)}$
                        </Text>
                        {bought > 0 && (
                          <Text fontSize="xs" color="fg.muted">· Déjà acheté : {bought}</Text>
                        )}
                      </HStack>
                    </Box>
                    <HStack gap={2} flexShrink={0}>
                      <IconButton
                        aria-label={`Retirer un billet ${option.name}`}
                        variant="outline"
                        boxSize="12"
                        fontSize="2xl"
                        fontWeight="800"
                        borderRadius="xl"
                        onClick={() => change(option.id, -1)}
                        disabled={qty === 0}
                      >
                        −
                      </IconButton>
                      <Text fontSize="2xl" fontWeight="800" minW="8" textAlign="center">{qty}</Text>
                      <IconButton
                        aria-label={`Ajouter un billet ${option.name}`}
                        variant="outline"
                        boxSize="12"
                        fontSize="2xl"
                        fontWeight="800"
                        borderRadius="xl"
                        onClick={() => change(option.id, 1)}
                        disabled={left === 0}
                      >
                        +
                      </IconButton>
                    </HStack>
                  </Flex>
                );
              })}
            </VStack>
            {limited && (
              <Text
                mt={4}
                fontSize="sm"
                fontWeight="600"
                textAlign="center"
                color={left === 0 ? 'orange.600' : 'fg.muted'}
                _dark={{ color: left === 0 ? 'orange.300' : 'fg.muted' }}
              >
                {left === 0
                  ? `Limite de ${plural(event.maxPerEmployee as number, 'billet')} par personne atteinte`
                  : `Il vous reste ${plural(left, 'billet')} (max ${event.maxPerEmployee} par personne)`}
              </Text>
            )}
          </DialogBody>
          <DialogFooter pt={6}>
            <HStack gap={3} w="full">
              <Button flex={1} variant="outline" size="lg" onClick={onClose}>
                Annuler
              </Button>
              <Button
                flex={2}
                size="lg"
                fontWeight="700"
                bg={ACCENT}
                color="white"
                _hover={{ bg: '#005a8c' }}
                disabled={selected === 0}
                onClick={() => onConfirm(quantities)}
              >
                {selected === 0
                  ? 'Ajouter'
                  : `Ajouter ${plural(selected, 'billet')} · ${subtotal.toFixed(2)}$`}
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
