'use client';

import {
  Button,
  Text,
  DialogRoot,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogTitle,
} from '@chakra-ui/react';

interface UnknownProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnknownProductModal({ open, onOpenChange }: UnknownProductModalProps) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
      size="md"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent p={8} textAlign="center">
          <DialogHeader pb={4}>
            <DialogTitle fontSize="2xl" fontWeight="700" color="red.500">
              Produit inconnu
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text fontSize="lg" fontWeight="500">
              Ce produit n&apos;est pas reconnu.
            </Text>
            <Text mt={4} fontSize="md" color="fg.muted">
              Veuillez voir un administrateur OPN pour ajouter ce produit au
              système de la cantine.
            </Text>
          </DialogBody>
          <DialogFooter pt={6} justifyContent="center">
            <Button
              size="lg"
              colorPalette="gray"
              onClick={() => onOpenChange(false)}
            >
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
