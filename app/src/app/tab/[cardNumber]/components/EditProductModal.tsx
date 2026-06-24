'use client';

import {
  Button,
  HStack,
  VStack,
  Input,
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
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) onQtyChange(val);
              }}
              fontSize="3xl"
              fontWeight="800"
              textAlign="center"
              py={6}
              h="auto"
              autoFocus
            />
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
