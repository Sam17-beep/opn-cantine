'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Heading,
  Button,
  VStack,
  Text,
  Input,
  HStack,
  Spinner,
  Flex,
  Separator,
} from '@chakra-ui/react';
import { ScannedItemList } from '@/components/ScannedItemList';
import { useCart } from './hooks/useCart';
import { useSaveFlow } from './hooks/useSaveFlow';
import { HistoryModal } from './components/HistoryModal';
import { LeaderboardBadge } from './components/LeaderboardBadge';
import { SaveModal } from './components/SaveModal';
import { ResetModal } from './components/ResetModal';
import { EditProductModal } from './components/EditProductModal';
import { UnknownProductModal } from './components/UnknownProductModal';
import { TicketPickerModal } from './components/TicketPickerModal';
import type { Employee, ScannedProduct } from './types';
import { logAction, logActionOnce } from '@/lib/client/action-log.client';
import type { TicketOption } from '@/lib/domain/entities/announcement.entity';
import { remainingAllowance, ticketLineName } from '@/lib/domain/ticket-options';

type TicketEvent = {
  id: string;
  title: string;
  options: TicketOption[];
  maxPerEmployee?: number | null;
};
type AnnouncementEvent = TicketEvent & {
  salesStart?: string | null;
  salesEnd?: string | null;
  purchased?: { total: number; byOption: Record<string, number> };
};

const NO_PURCHASES = { total: 0, byOption: {} as Record<string, number> };

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isOnSale(event: AnnouncementEvent): boolean {
  const today = localDateString();
  return event.options?.length > 0 && !!event.salesStart && today >= event.salesStart &&
    (!event.salesEnd || today <= event.salesEnd);
}

function ticketHint(purchased: number, max: number | null | undefined, left: number): string | null {
  const parts: string[] = [];
  if (purchased > 0) parts.push(`Vous avez déjà acheté ${purchased} billet${purchased > 1 ? 's' : ''}`);
  if (max != null) parts.push(left === 0 ? `Limite de ${max} atteinte` : `Max ${max} par personne`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function getBalanceColor(value: number) {
  const clamped = Math.max(0, Math.min(value, 80));
  const ratio = clamped / 80;

  // green (34,197,94) → yellow (234,179,8) → red (239,68,68)
  let r: number, g: number, b: number;
  if (ratio <= 0.5) {
    const t = ratio * 2;
    r = Math.round(34 + (234 - 34) * t);
    g = Math.round(197 + (179 - 197) * t);
    b = Math.round(94 + (8 - 94) * t);
  } else {
    const t = (ratio - 0.5) * 2;
    r = Math.round(234 + (239 - 234) * t);
    g = Math.round(179 + (68 - 179) * t);
    b = Math.round(8 + (68 - 8) * t);
  }

  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
    fg: `rgb(${r}, ${g}, ${b})`,
  };
}

export default function TabPage({
  params,
}: {
  params: Promise<{ cardNumber: string }>;
}) {
  const { cardNumber } = use(params);
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [ticketEvent, setTicketEvent] = useState<TicketEvent | null>(null);
  const [purchased, setPurchased] = useState(NO_PURCHASES);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [unknownOpen, setUnknownOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ScannedProduct | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Read at scan time rather than passed as a value: `save` is declared below,
  // and the ref keeps the answer current without re-running effects.
  const modalOpenRef = useRef(false);
  const savingRef = useRef(false);
  const cart = useCart(setUnknownOpen, {
    isScannerEnabled: () => !modalOpenRef.current,
    isSaleInProgress: () => savingRef.current,
  });

  const save = useSaveFlow({
    employee,
    cardNumber,
    pendingTotal: cart.pendingTotal,
    scannedProducts: cart.scannedProducts,
    setLoading,
    router,
    resetOpen,
    unknownOpen,
    editProduct,
    historyOpen,
    ticketPickerOpen,
    scanPending: cart.scanPending,
  });

  const modalOpen =
    save.saveOpen || resetOpen || unknownOpen || editProduct !== null || historyOpen || ticketPickerOpen;
  modalOpenRef.current = modalOpen;
  savingRef.current = save.saving;

  useEffect(() => {
    const fetchEmployee = async () => {
      const res = await fetch(
        `/api/employees/lookup?cardNumber=${encodeURIComponent(cardNumber)}`
      );
      const data = await res.json();
      if (data.found) {
        logActionOnce('login', 'login', {
          cardNumber,
          employeeNumber: data.employee.employeeNumber,
          tab: data.employee.tab,
        });
        setEmployee(data.employee);
      } else {
        logActionOnce('login', 'login', { cardNumber, outcome: 'not_found' });
        router.push('/');
      }
    };
    fetchEmployee();

    fetch(`/api/announcement?cardNumber=${encodeURIComponent(cardNumber)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: AnnouncementEvent | null) => {
        if (data && isOnSale(data)) {
          setTicketEvent({
            id: data.id,
            title: data.title,
            options: data.options,
            maxPerEmployee: data.maxPerEmployee ?? null,
          });
          setPurchased(data.purchased ?? NO_PURCHASES);
        }
      })
      .catch(() => null);
  }, [cardNumber, router]);

  const handleConfirmReset = async () => {
    setResetOpen(false);
    setLoading(true);
    const res = await fetch('/api/employees/tab', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber }),
    });
    logAction('reset_tab', { cardNumber, previousTab: employee?.tab ?? null, ok: res.ok });
    if (res.ok) {
      const data = await res.json();
      setEmployee(data);
      cart.setPendingTotal(0);
      cart.setScannedProducts([]);
    }
    setLoading(false);
  };

  // Keep scanner input focused when no modal is open
  useEffect(() => {
    const refocus = () => {
      if (!modalOpen) cart.scanInputRef.current?.focus();
    };
    document.addEventListener('click', refocus);
    return () => document.removeEventListener('click', refocus);
  }, [modalOpen, cart.scanInputRef]);

  const ticketsInCart = ticketEvent
    ? cart.scannedProducts.reduce((sum, p) => sum + (p.eventId === ticketEvent.id ? p.qty : 0), 0)
    : 0;
  const ticketsLeft = remainingAllowance(ticketEvent?.maxPerEmployee, purchased.total, ticketsInCart);
  const ticketsHint = ticketEvent ? ticketHint(purchased.total, ticketEvent.maxPerEmployee, ticketsLeft) : null;

  const addTickets = (quantities: Record<string, number>) => {
    if (!ticketEvent) return;
    cart.addTickets(
      ticketEvent.id,
      ticketEvent.options.map((option) => ({
        optionId: option.id,
        name: ticketLineName(ticketEvent.title, option, ticketEvent.options.length),
        price: option.price,
        qty: quantities[option.id] ?? 0,
      }))
    );
  };

  const hasPending = cart.pendingTotal !== 0;
  const projectedTab = employee ? employee.tab + cart.pendingTotal : 0;
  const balanceColor = getBalanceColor(projectedTab);
  const pendingColor = getBalanceColor(cart.pendingTotal > 0 ? projectedTab : 0);

  if (!employee) return null;

  return (
    <>
      <Flex
        h="100dvh"
        overflow="hidden"
        direction="column"
        px={8}
        py={5}
        gap={3}
      >
        {/* Top bar */}
        <Flex justify="space-between" align="center" flexShrink={0}>
          <VStack align="start" gap={0}>
            <Heading
              size={{ base: '2xl', md: '4xl' }}
              fontWeight="800"
              letterSpacing="-0.02em"
            >
              {employee.employeeNumber}
            </Heading>
            <LeaderboardBadge cardNumber={cardNumber} pendingTotal={cart.pendingTotal} />
          </VStack>
          <Button
            aria-label="Voir historique"
            variant="outline"
            size="md"
            color="fg.muted"
            fontWeight="600"
            onClick={() => setHistoryOpen(true)}
          >
            Voir historique
          </Button>
        </Flex>

        {/* Hidden barcode scanner input */}
        <Input
          ref={cart.scanInputRef}
          value={cart.scanValue}
          onBlur={() => {
            if (!modalOpen) cart.scanInputRef.current?.focus();
          }}
          onChange={cart.handleScanChange}
          onKeyDown={cart.handleScanKeyDown}
          position="absolute"
          opacity={0}
          h={0}
          w={0}
          overflow="hidden"
          inputMode="none"
          autoFocus
        />

        {/* Takes whatever height is left over, so the cart grows into the
            available space instead of pushing the page past the screen. */}
        <Box
          flex="1 1 auto"
          minH="128px"
          w="full"
          position="relative"
          zIndex={10}
        >
          {/* Scan feedback, and the lookup that precedes it. Sits above the
              cart because it is the newest thing that happened. */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            py={3}
            px={5}
            borderRadius="xl"
            bg="bg.subtle"
            textAlign="center"
            opacity={cart.scanFeedback || cart.scanPending ? 1 : 0}
            visibility={cart.scanFeedback || cart.scanPending ? 'visible' : 'hidden'}
            transition="all 0.2s"
            zIndex={2}
          >
            <HStack justify="center" gap={3}>
              {cart.scanPending && <Spinner size="sm" borderWidth="3px" />}
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600">
                {cart.scanPending ? 'Recherche du produit…' : cart.scanFeedback || ' '}
              </Text>
            </HStack>
          </Box>

          {/* Scanned products list */}
          <Box
            w="full"
            opacity={cart.scannedProducts.length > 0 && !cart.scanFeedback ? 1 : 0}
            visibility={cart.scannedProducts.length > 0 && !cart.scanFeedback ? 'visible' : 'hidden'}
            transition="all 0.2s"
            position="absolute"
            inset={0}
            zIndex={1}
          >
            <ScannedItemList
              items={cart.scannedProducts}
              maxH="100%"
              onEdit={(item) => {
                setEditProduct(item);
                setEditQty(item.qty);
              }}
            />
          </Box>
        </Box>

        {/* Main content */}
        <Flex direction="column" gap={4} flexShrink={0}>
          {/* Balance */}
          <Box
            w="full"
            py={{ base: 5, md: 6 }}
            borderRadius="2xl"
            bg={balanceColor.bg}
            textAlign="center"
          >
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              fontWeight="500"
              color={balanceColor.fg}
              mb={1}
            >
              {hasPending ? 'Aperçu du solde' : 'Solde actuel'}
            </Text>
            <Text
              fontSize={{ base: '7xl', md: '8xl' }}
              fontWeight="800"
              lineHeight="1"
              color={balanceColor.fg}
            >
              {projectedTab.toFixed(2)}$
            </Text>

            <Text
              fontSize={{ base: 'md', md: 'lg' }}
              fontWeight="600"
              mt={2}
              color={pendingColor.fg}
              visibility={hasPending ? 'visible' : 'hidden'}
            >
              {cart.pendingTotal > 0 ? '+' : ''}
              {cart.pendingTotal.toFixed(2)}$ depuis {employee.tab.toFixed(2)}$
            </Text>

            {projectedTab > 75 && (
              <Text
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight="600"
                mt={2}
                color="red.500"
              >
                Votre solde dépasse 75$. Merci de payer votre dette.
              </Text>
            )}
          </Box>

          {/* Quick-add buttons */}
          <HStack gap={3} w="full" align="start">
            <Button
              flex={1}
              h="auto"
              py={4}
              colorPalette="gray"
              variant="outline"
              onClick={cart.addCoffee}
              disabled={loading}
              fontWeight="600"
              fontSize={{ base: 'lg', md: 'xl' }}
            >
              Café (+1.00$)
            </Button>
            {ticketEvent && (
              <VStack flex={1} gap={1} align="stretch">
                <Button
                  h="auto"
                  py={ticketEvent.options.length > 1 ? 2 : 4}
                  variant="outline"
                  borderColor="#0068A2"
                  color="#0068A2"
                  _hover={{ bg: '#0068A210' }}
                  _dark={{ color: 'blue.300', borderColor: 'blue.300', _hover: { bg: 'blue.subtle' } }}
                  onClick={() =>
                    ticketEvent.options.length > 1
                      ? setTicketPickerOpen(true)
                      : addTickets({ [ticketEvent.options[0].id]: 1 })
                  }
                  disabled={loading || ticketsLeft === 0}
                  fontWeight="600"
                  fontSize={{ base: 'lg', md: 'xl' }}
                >
                  {ticketEvent.options.length > 1 ? (
                    <VStack gap={0}>
                      <Text>{ticketEvent.title}</Text>
                      <Text fontSize="sm" fontWeight="500" opacity={0.8}>
                        {ticketEvent.options.length} options
                      </Text>
                    </VStack>
                  ) : (
                    `${ticketEvent.options[0].name} (+${ticketEvent.options[0].price.toFixed(2)}$)`
                  )}
                </Button>
                {ticketsHint && (
                  <Text fontSize="sm" color="fg.muted" textAlign="center">
                    {ticketsHint}
                  </Text>
                )}
              </VStack>
            )}
          </HStack>

          <Separator />

          {/* Save + Reset */}
          <Flex direction={{ base: 'column', md: 'row' }} gap={4} w="full">
            <Button
              flex={{ md: 3 }}
              h="auto"
              py={4}
              colorPalette="gray"
              onClick={save.handleSave}
              loading={loading}
              fontWeight="600"
              fontSize={{ base: 'xl', md: '2xl' }}
            >
              {hasPending ? 'Sauvegarder' : 'Déconnexion'}
            </Button>
            <Button
              flex={{ md: 1 }}
              h="auto"
              py={4}
              variant="outline"
              colorPalette="red"
              onClick={() => setResetOpen(true)}
              loading={loading}
              fontWeight="600"
              fontSize={{ base: 'lg', md: 'xl' }}
            >
              J&apos;ai payé ma dette
            </Button>
          </Flex>
        </Flex>
      </Flex>

      <ResetModal
        open={resetOpen}
        employeeName={employee.employeeNumber}
        onOpenChange={setResetOpen}
        onConfirm={handleConfirmReset}
      />

      <SaveModal
        open={save.saveOpen}
        countdown={save.countdown}
        pendingTotal={cart.pendingTotal}
        projectedTab={projectedTab}
        scannedProducts={cart.scannedProducts}
        onCancel={save.cancelSave}
        onSave={() => {
          save.closeSaveCountdown();
          save.doSave();
        }}
      />

      <UnknownProductModal
        open={unknownOpen}
        onOpenChange={setUnknownOpen}
      />

      <EditProductModal
        product={editProduct}
        qty={editQty}
        maxQty={
          editProduct && ticketEvent && editProduct.eventId === ticketEvent.id
            ? editProduct.qty + ticketsLeft
            : undefined
        }
        onQtyChange={setEditQty}
        onOpenChange={(open) => { if (!open) setEditProduct(null); }}
        onDelete={() => {
          if (!editProduct) return;
          logAction('remove_item', {
            barcode: editProduct.barcode,
            name: editProduct.name,
            qty: editProduct.qty,
            price: editProduct.price,
          });
          cart.setPendingTotal((prev) => prev - editProduct.qty * editProduct.price);
          cart.setScannedProducts((prev) =>
            prev.filter((p) => p.lineId !== editProduct.lineId)
          );
          setEditProduct(null);
        }}
        onConfirm={(newQty) => {
          if (!editProduct) return;
          const delta = newQty - editProduct.qty;
          logAction('modify_item', {
            barcode: editProduct.barcode,
            name: editProduct.name,
            fromQty: editProduct.qty,
            toQty: newQty,
            price: editProduct.price,
          });
          cart.setPendingTotal((prev) => prev + delta * editProduct.price);
          cart.setScannedProducts((prev) =>
            prev.map((p) => (p.lineId === editProduct.lineId ? { ...p, qty: newQty } : p))
          );
          setEditProduct(null);
        }}
      />

      {ticketEvent && (
        <TicketPickerModal
          open={ticketPickerOpen}
          event={ticketEvent}
          purchased={purchased}
          inCart={ticketsInCart}
          onClose={() => setTicketPickerOpen(false)}
          onConfirm={(quantities) => {
            addTickets(quantities);
            setTicketPickerOpen(false);
          }}
        />
      )}

      <HistoryModal
        open={historyOpen}
        cardNumber={cardNumber}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
