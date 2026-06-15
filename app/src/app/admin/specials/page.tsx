'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { parseDate } from '@internationalized/date';
import { Pencil } from 'lucide-react';
import {
  Box,
  Button,
  DatePicker,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Separator,
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
import type { SpecialOverride, Special } from '@/lib/domain/entities/special.entity';

type SpecialStatus = 'current' | 'future' | 'past' | 'draft';

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStatus(special: Special): SpecialStatus {
  if (!special.start) return 'draft';
  const today = localDate();
  if (today < special.start) return 'future';
  if (special.end && today > special.end) return 'past';
  return 'current';
}

const STATUS_CONFIG: Record<SpecialStatus, { label: string; textColor: string; borderColor: string; bg: string }> = {
  current: { label: 'En cours',  textColor: 'green.600',  borderColor: 'green.400',  bg: 'green.subtle'  },
  future:  { label: 'À venir',   textColor: 'blue.600',   borderColor: 'blue.400',   bg: 'blue.subtle'   },
  past:    { label: 'Terminé',   textColor: 'fg.muted',   borderColor: 'border',     bg: 'bg'            },
  draft:   { label: 'Brouillon', textColor: 'fg.muted',   borderColor: 'border',     bg: 'bg.subtle'     },
};

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  if (start && end) return `${start} → ${end}`;
  if (start) return `Dès ${start}`;
  return `Jusqu'au ${end}`;
}

interface RangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  onClear: () => void;
}

function RangePicker({ start, end, onChange, onClear }: RangePickerProps) {
  const value = [
    start ? parseDate(start) : null,
    end ? parseDate(end) : null,
  ].filter(Boolean) as ReturnType<typeof parseDate>[];

  return (
    <DatePicker.Root
      inline
      selectionMode="range"
      value={value}
      onValueChange={(details) => {
        const [s, e] = details.valueAsString;
        onChange(s ?? '', e ?? '');
      }}
      locale="fr-CA"
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      closeOnSelect={false}
    >
      <DatePicker.Content>
        <DatePicker.View view="day">
          <DatePicker.ViewControl>
            <DatePicker.PrevTrigger asChild>
              <IconButton aria-label="Précédent" variant="ghost" size="sm">‹</IconButton>
            </DatePicker.PrevTrigger>
            <DatePicker.ViewTrigger asChild>
              <Button variant="ghost" size="sm" fontWeight="600" textTransform="capitalize">
                <DatePicker.RangeText />
              </Button>
            </DatePicker.ViewTrigger>
            <DatePicker.NextTrigger asChild>
              <IconButton aria-label="Suivant" variant="ghost" size="sm">›</IconButton>
            </DatePicker.NextTrigger>
          </DatePicker.ViewControl>
          <DatePicker.Table>
            <DatePicker.TableHead>
              <DatePicker.TableRow>
                <DatePicker.Context>
                  {(api) => api.weekDays.map((wd, i) => (
                    <DatePicker.TableHeader key={i}>
                      <Text fontSize="xs" color="fg.muted" fontWeight="600" w="36px" textAlign="center">
                        {wd.short}
                      </Text>
                    </DatePicker.TableHeader>
                  ))}
                </DatePicker.Context>
              </DatePicker.TableRow>
            </DatePicker.TableHead>
            <DatePicker.TableBody>
              <DatePicker.Context>
                {(api) => api.weeks.map((week, i) => (
                  <DatePicker.TableRow key={i}>
                    {week.map((day, j) => (
                      <DatePicker.TableCell key={j} value={day}>
                        <DatePicker.TableCellTrigger asChild>
                          <Button
                            variant="ghost"
                            size="xs"
                            w="36px"
                            h="36px"
                            p={0}
                            borderRadius="full"
                            fontSize="sm"
                          >
                            {day.day}
                          </Button>
                        </DatePicker.TableCellTrigger>
                      </DatePicker.TableCell>
                    ))}
                  </DatePicker.TableRow>
                ))}
              </DatePicker.Context>
            </DatePicker.TableBody>
          </DatePicker.Table>
        </DatePicker.View>

        <DatePicker.View view="month">
          <DatePicker.ViewControl>
            <DatePicker.PrevTrigger asChild>
              <IconButton aria-label="Précédent" variant="ghost" size="sm">‹</IconButton>
            </DatePicker.PrevTrigger>
            <DatePicker.ViewTrigger asChild>
              <Button variant="ghost" size="sm" fontWeight="600">
                <DatePicker.RangeText />
              </Button>
            </DatePicker.ViewTrigger>
            <DatePicker.NextTrigger asChild>
              <IconButton aria-label="Suivant" variant="ghost" size="sm">›</IconButton>
            </DatePicker.NextTrigger>
          </DatePicker.ViewControl>
          <DatePicker.Table>
            <DatePicker.TableBody>
              <DatePicker.Context>
                {(api) => api.getMonthsGrid({ columns: 4, format: 'short' }).map((months, i) => (
                  <DatePicker.TableRow key={i}>
                    {months.map((month, j) => (
                      <DatePicker.TableCell key={j} value={month.value}>
                        <DatePicker.TableCellTrigger asChild>
                          <Button variant="ghost" size="sm" w="60px">{month.label}</Button>
                        </DatePicker.TableCellTrigger>
                      </DatePicker.TableCell>
                    ))}
                  </DatePicker.TableRow>
                ))}
              </DatePicker.Context>
            </DatePicker.TableBody>
          </DatePicker.Table>
        </DatePicker.View>

        <DatePicker.View view="year">
          <DatePicker.ViewControl>
            <DatePicker.PrevTrigger asChild>
              <IconButton aria-label="Précédent" variant="ghost" size="sm">‹</IconButton>
            </DatePicker.PrevTrigger>
            <DatePicker.ViewTrigger asChild>
              <Button variant="ghost" size="sm" fontWeight="600">
                <DatePicker.RangeText />
              </Button>
            </DatePicker.ViewTrigger>
            <DatePicker.NextTrigger asChild>
              <IconButton aria-label="Suivant" variant="ghost" size="sm">›</IconButton>
            </DatePicker.NextTrigger>
          </DatePicker.ViewControl>
          <DatePicker.Table>
            <DatePicker.TableBody>
              <DatePicker.Context>
                {(api) => api.getYearsGrid({ columns: 4 }).map((years, i) => (
                  <DatePicker.TableRow key={i}>
                    {years.map((year, j) => (
                      <DatePicker.TableCell key={j} value={year.value}>
                        <DatePicker.TableCellTrigger asChild>
                          <Button variant="ghost" size="sm" w="60px">{year.label}</Button>
                        </DatePicker.TableCellTrigger>
                      </DatePicker.TableCell>
                    ))}
                  </DatePicker.TableRow>
                ))}
              </DatePicker.Context>
            </DatePicker.TableBody>
          </DatePicker.Table>
        </DatePicker.View>
      </DatePicker.Content>

      {(start || end) && (
        <Flex justify="space-between" align="center" mt={2} px={1}>
          <Text fontSize="xs" color="fg.muted">
            {formatDateRange(start || null, end || null)}
          </Text>
          <Button variant="ghost" size="xs" color="fg.muted" onClick={onClear}>
            Effacer
          </Button>
        </Flex>
      )}
    </DatePicker.Root>
  );
}

export default function SpecialsPage() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Special | null>(null);

  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [overrides, setOverrides] = useState<SpecialOverride[]>([]);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookedUp, setLookedUp] = useState<{ name: string; price: number } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [overridePriceInput, setOverridePriceInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/specials');
    if (res.ok) setSpecials(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetSubForm = () => {
    setBarcodeInput('');
    setLookedUp(null);
    setLookupError('');
    setOverridePriceInput('');
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDateStart('');
    setDateEnd('');
    setOverrides([]);
    resetSubForm();
    setModalOpen(true);
  };

  const openEdit = (special: Special) => {
    setEditingId(special.id ?? null);
    setName(special.name);
    setDateStart(special.start ?? '');
    setDateEnd(special.end ?? '');
    setOverrides(special.overrides ?? []);
    resetSubForm();
    setModalOpen(true);
  };

  const lookupBarcode = async (barcode: string) => {
    const value = barcode.trim();
    if (!value) return;
    setLookingUp(true);
    setLookedUp(null);
    setLookupError('');
    try {
      const res = await fetch(`/api/products/lookup?barcode=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data.found) {
        setLookedUp({ name: data.product.name, price: data.product.price });
      } else {
        setLookupError('Produit introuvable');
      }
    } catch {
      setLookupError('Erreur de connexion');
    } finally {
      setLookingUp(false);
    }
  };

  const addOverride = () => {
    if (!lookedUp || !overridePriceInput || Number(overridePriceInput) <= 0) return;
    setOverrides((prev) => [
      ...prev,
      {
        barcode: barcodeInput.trim(),
        productName: lookedUp.name,
        originalPrice: lookedUp.price,
        overridePrice: Number(overridePriceInput),
      },
    ]);
    resetSubForm();
  };

  const removeOverride = (index: number) => {
    setOverrides((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const body = {
      name: name.trim(),
      start: dateStart || null,
      end: dateEnd || null,
      overrides,
    };

    const url = editingId ? `/api/specials/${editingId}` : '/api/specials';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) return;

    const saved = await res.json();
    if (editingId) {
      setSpecials((prev) => prev.map((s) => s.id === saved.id ? saved : s));
    } else {
      setSpecials((prev) => [saved, ...prev]);
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/specials/${deleteTarget.id}`, { method: 'DELETE' });
    setSpecials((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <Flex direction="column" px={8} py={6} pb={8}>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="800" letterSpacing="-0.02em">
          Spéciaux
        </Heading>
        <Button colorPalette="gray" size="lg" fontWeight="600" onClick={openCreate}>
          + Nouveau spécial
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">Chargement...</Text>
        </Flex>
      ) : specials.length === 0 ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">Aucun spécial. Créez-en un!</Text>
        </Flex>
      ) : (
        <Box borderRadius="xl" border="1px solid" borderColor="border" overflow="hidden">
          <Flex bg="bg.subtle" px={5} py={3} gap={4}>
            <Text flex={3} fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em">Spécial</Text>
            <Text flex={3} fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em">Période</Text>
            <Text w="80px" fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em" textAlign="center">Produits</Text>
            <Box w="72px" />
          </Flex>

          {specials.map((special, i) => {
            const status = getStatus(special);
            const cfg = STATUS_CONFIG[status];
            return (
              <Box key={special.id}>
                {i > 0 && <Separator />}
                <Flex
                  align="center"
                  px={5}
                  py={4}
                  gap={4}
                  bg={cfg.bg}
                  borderLeft="4px solid"
                  borderLeftColor={cfg.borderColor}
                  _hover={{ filter: 'brightness(0.97)' }}
                >
                  <Box flex={3} minW={0}>
                    <Text fontWeight="700" fontSize="md" truncate>{special.name}</Text>
                    <Text fontSize="xs" fontWeight="600" color={cfg.textColor} mt="2px">{cfg.label}</Text>
                  </Box>
                  <Box flex={3}>
                    <Text fontSize="sm" color={special.start || special.end ? 'fg' : 'fg.muted'}>
                      {formatDateRange(special.start, special.end)}
                    </Text>
                  </Box>
                  <Box w="80px" textAlign="center">
                    <Text fontSize="lg" fontWeight="800">{special.overrides.length}</Text>
                  </Box>
                  <HStack w="72px" gap={1} justify="flex-end">
                    <IconButton aria-label="Modifier" variant="ghost" size="sm" onClick={() => openEdit(special)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      aria-label="Supprimer"
                      variant="ghost"
                      size="sm"
                      fontSize="md"
                      color="fg.muted"
                      _hover={{ color: 'red.500' }}
                      onClick={() => setDeleteTarget(special)}
                    >
                      ✕
                    </IconButton>
                  </HStack>
                </Flex>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Create / Edit modal */}
      <DialogRoot
        open={modalOpen}
        onOpenChange={(e) => { if (!e.open) setModalOpen(false); }}
        placement="center"
        size="lg"
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent p={6}>
            <DialogHeader pb={4}>
              <DialogTitle fontSize="xl" fontWeight="700">
                {editingId ? 'Modifier le spécial' : 'Nouveau spécial'}
              </DialogTitle>
            </DialogHeader>
            <DialogBody py={0}>
              <VStack gap={5} align="stretch">
                <Box>
                  <Text fontWeight="700" fontSize="sm" mb={2}>Nom</Text>
                  <Input
                    placeholder="ex : Vente d'été"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fontSize="md"
                    autoFocus
                  />
                </Box>

                <Separator />

                <Box>
                  <Text fontWeight="700" fontSize="sm" mb={1}>Période</Text>
                  <Text fontSize="xs" color="fg.muted" mb={3}>Les prix spéciaux s&apos;appliquent pendant cette période.</Text>
                  <RangePicker
                    start={dateStart}
                    end={dateEnd}
                    onChange={(s, e) => { setDateStart(s); setDateEnd(e); }}
                    onClear={() => { setDateStart(''); setDateEnd(''); }}
                  />
                </Box>

                <Separator />

                <Box>
                  <Text fontWeight="700" fontSize="sm" mb={3}>Produits en spécial</Text>

                  {overrides.length > 0 && (
                    <Box borderRadius="lg" border="1px solid" borderColor="border" overflow="hidden" mb={4}>
                      <Flex bg="bg.subtle" px={4} py={2} gap={3}>
                        <Text flex={3} fontSize="xs" fontWeight="700" color="fg.muted">PRODUIT</Text>
                        <Text w="70px" fontSize="xs" fontWeight="700" color="fg.muted" textAlign="right">PRIX REG.</Text>
                        <Text w="70px" fontSize="xs" fontWeight="700" color="fg.muted" textAlign="right">SPÉCIAL</Text>
                        <Box w="32px" />
                      </Flex>
                      {overrides.map((o, i) => (
                        <Box key={i}>
                          {i > 0 && <Separator />}
                          <Flex align="center" px={4} py={3} gap={3}>
                            <Box flex={3} minW={0}>
                              <Text fontSize="sm" fontWeight="600" truncate>{o.productName}</Text>
                              <Text fontSize="xs" color="fg.muted">{o.barcode}</Text>
                            </Box>
                            <Text w="70px" fontSize="sm" color="fg.muted" textAlign="right">
                              {o.originalPrice.toFixed(2)}$
                            </Text>
                            <Text w="70px" fontSize="sm" fontWeight="700" color="green.600" textAlign="right">
                              {o.overridePrice.toFixed(2)}$
                            </Text>
                            <IconButton
                              aria-label="Retirer"
                              variant="ghost"
                              size="xs"
                              w="32px"
                              color="fg.muted"
                              _hover={{ color: 'red.500' }}
                              onClick={() => removeOverride(i)}
                            >
                              ✕
                            </IconButton>
                          </Flex>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box borderRadius="lg" border="1px solid" borderColor="border" p={4}>
                    <Text fontSize="sm" fontWeight="700" mb={3} color="fg.muted">Ajouter un produit</Text>
                    <VStack gap={3} align="stretch">
                      <Box>
                        <Text fontSize="xs" fontWeight="600" mb={1}>Code-barres</Text>
                        <Input
                          ref={barcodeRef}
                          placeholder="Scannez ou entrez le code-barres"
                          value={barcodeInput}
                          onChange={(e) => {
                            setBarcodeInput(e.target.value.replace(/\D/g, ''));
                            setLookedUp(null);
                            setLookupError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') lookupBarcode(barcodeInput);
                          }}
                          fontSize="sm"
                          inputMode="numeric"
                        />
                      </Box>

                      {lookupError && (
                        <Text fontSize="sm" color="red.500">{lookupError}</Text>
                      )}

                      {lookedUp && (
                        <Flex
                          align="center"
                          justify="space-between"
                          px={3}
                          py={2}
                          bg="bg.subtle"
                          borderRadius="md"
                        >
                          <Text fontSize="sm" fontWeight="600">{lookedUp.name}</Text>
                          <Text fontSize="sm" color="fg.muted">{lookedUp.price.toFixed(2)}$</Text>
                        </Flex>
                      )}

                      {lookedUp && (
                        <HStack gap={3} align="end">
                          <Box flex={1}>
                            <Text fontSize="xs" fontWeight="600" mb={1}>Prix spécial ($)</Text>
                            <Input
                              type="number"
                              step="0.25"
                              min="0.01"
                              placeholder="0.00"
                              value={overridePriceInput}
                              onChange={(e) => setOverridePriceInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') addOverride(); }}
                              fontSize="sm"
                              autoFocus
                            />
                          </Box>
                          <Button
                            colorPalette="gray"
                            size="md"
                            fontWeight="600"
                            onClick={addOverride}
                            disabled={!overridePriceInput || Number(overridePriceInput) <= 0}
                          >
                            Ajouter
                          </Button>
                        </HStack>
                      )}

                      {!lookedUp && !lookupError && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => lookupBarcode(barcodeInput)}
                          disabled={!barcodeInput.trim() || lookingUp}
                          loading={lookingUp}
                        >
                          Rechercher
                        </Button>
                      )}
                    </VStack>
                  </Box>
                </Box>
              </VStack>
            </DialogBody>
            <DialogFooter pt={6}>
              <HStack gap={3} w="full">
                <Button flex={1} variant="outline" size="lg" onClick={() => setModalOpen(false)}>
                  Annuler
                </Button>
                <Button
                  flex={2}
                  colorPalette="gray"
                  size="lg"
                  fontWeight="600"
                  onClick={handleSave}
                  loading={saving}
                  disabled={!name.trim()}
                >
                  Sauvegarder
                </Button>
              </HStack>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* Delete confirmation modal */}
      <DialogRoot
        open={!!deleteTarget}
        onOpenChange={(e) => { if (!e.open) setDeleteTarget(null); }}
        placement="center"
        size="sm"
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent p={6}>
            <DialogHeader pb={2}>
              <DialogTitle fontSize="lg" fontWeight="700">Supprimer le spécial</DialogTitle>
            </DialogHeader>
            <DialogBody py={4}>
              <Text color="fg.muted">
                Supprimer &ldquo;{deleteTarget?.name}&rdquo; ? Cette action est irréversible.
              </Text>
            </DialogBody>
            <DialogFooter>
              <HStack gap={3} w="full">
                <Button flex={1} variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
                <Button flex={1} colorPalette="red" onClick={handleDelete}>Supprimer</Button>
              </HStack>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Flex>
  );
}
