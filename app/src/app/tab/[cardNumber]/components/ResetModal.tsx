'use client';

import {
  Button,
  HStack,
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

interface ResetModalProps {
  open: boolean;
  employeeName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ResetModal({ open, employeeName, onOpenChange, onConfirm }: ResetModalProps) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
      size="lg"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent p={8}>
          <DialogHeader pb={4}>
            <DialogTitle fontSize="2xl" fontWeight="700">
              J&apos;ai payé ma dette
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text fontSize="lg">
              Le solde de {employeeName} sera remis à 0.00$. Cette action est
              irréversible.
            </Text>
          </DialogBody>
          <DialogFooter pt={6}>
            <HStack gap={3} w="full">
              <Button
                flex={1}
                variant="outline"
                size="lg"
                fontSize="lg"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                flex={1}
                colorPalette="red"
                size="lg"
                fontSize="lg"
                onClick={onConfirm}
              >
                Confirmer
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
