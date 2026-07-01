'use client';

import {
  Button,
  HStack,
  VStack,
  Text,
  IconButton,
  DialogRoot,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogTitle,
} from '@chakra-ui/react';
import type { ScannedProduct } from '../types';

interface EditProductModalProps {
  product: ScannedProduct | null;
  qty: number;
  onQtyChange: (qty: number) => void;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onConfirm: (newQty: number) => void;
}

export function EditProductModal({
  product,
  qty,
  onQtyChange,
  onOpenChange,
  onDelete,
  onConfirm,
}: EditProductModalProps) {
  return (
    <DialogRoot
      open={!!product}
      onOpenChange={(e) => { if (!e.open) onOpenChange(false); }}
      placement="center"
      size="sm"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent p={6}>
          <DialogHeader pb={3}>
            <DialogTitle fontSize="xl" fontWeight="700">
              {product?.name}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <HStack justify="center" gap={6}>
              <IconButton
                aria-label="Diminuer la quantité"
                variant="outline"
                onClick={() => onQtyChange(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                boxSize="16"
                fontSize="4xl"
                fontWeight="800"
                borderRadius="2xl"
              >
                −
              </IconButton>
              <Text
                fontSize="5xl"
                fontWeight="800"
                minW="20"
                textAlign="center"
              >
                {qty}
              </Text>
              <IconButton
                aria-label="Augmenter la quantité"
                variant="outline"
                onClick={() => onQtyChange(qty + 1)}
                boxSize="16"
                fontSize="4xl"
                fontWeight="800"
                borderRadius="2xl"
              >
                +
              </IconButton>
            </HStack>
          </DialogBody>
          <DialogFooter pt={5}>
            <VStack gap={3} w="full">
              <Button
                w="full"
                colorPalette="red"
                variant="outline"
                size="lg"
                onClick={onDelete}
              >
                Supprimer
              </Button>
              <HStack gap={3} w="full">
                <Button
                  flex={1}
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  flex={1}
                  colorPalette="gray"
                  size="lg"
                  onClick={() => onConfirm(qty)}
                >
                  Confirmer
                </Button>
              </HStack>
            </VStack>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
