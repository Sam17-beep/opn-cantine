'use client';

import { useEffect, useState, useCallback } from 'react';
import { parseDate, type DateValue } from '@internationalized/date';
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
  Switch,
  Text,
  Textarea,
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

interface AnnouncementProduct {
  name: string;
  price: number;
}

interface AnnouncementEvent {
  id: string;
  title: string;
  description: string;
  bannerStart?: string | null;
  bannerEnd?: string | null;
  salesStart?: string | null;
  salesEnd?: string | null;
  product?: AnnouncementProduct | null;
}

interface Stats {
  byName: Record<string, { qty: number; revenue: number }>;
  total: { qty: number; revenue: number };
}

type EventStatus = 'current' | 'future' | 'past' | 'draft';

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStatus(event: AnnouncementEvent): EventStatus {
  if (!event.bannerStart) return 'draft';
  const today = localDate();
  if (today < event.bannerStart) return 'future';
  if (event.bannerEnd && today > event.bannerEnd) return 'past';
  return 'current';
}

const STATUS_CONFIG: Record<EventStatus, { label: string; textColor: string; borderColor: string; bg: string }> = {
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
  ].filter(Boolean) as DateValue[];

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

const EMPTY_FORM = {
  title: '',
  description: '',
  bannerStart: '',
  bannerEnd: '',
  salesStart: '',
  salesEnd: '',
  hasProduct: false,
  productName: '',
  productPrice: '',
};

export default function AnnouncementsPage() {
  const [events, setEvents] = useState<AnnouncementEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overlapError, setOverlapError] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementEvent | null>(null);

  const fetchAll = useCallback(async () => {
    const [eventsRes, statsRes] = await Promise.all([
      fetch('/api/announcements'),
      fetch('/api/announcement/stats'),
    ]);
    if (eventsRes.ok) setEvents(await eventsRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOverlapError(false);
    setModalOpen(true);
  };

  const openEdit = (event: AnnouncementEvent) => {
    setEditingId(event.id);
    setOverlapError(false);
    setForm({
      title: event.title,
      description: event.description,
      bannerStart: event.bannerStart ?? '',
      bannerEnd: event.bannerEnd ?? '',
      salesStart: event.salesStart ?? '',
      salesEnd: event.salesEnd ?? '',
      hasProduct: !!event.product,
      productName: event.product?.name ?? '',
      productPrice: event.product ? String(event.product.price) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    setOverlapError(false);

    const body = {
      title: form.title,
      description: form.description,
      bannerStart: form.bannerStart || null,
      bannerEnd: form.bannerEnd || null,
      salesStart: form.salesStart || null,
      salesEnd: form.salesEnd || null,
      product: form.hasProduct && form.productName.trim() && form.productPrice
        ? { name: form.productName.trim(), price: parseFloat(form.productPrice) }
        : null,
    };

    const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    setSaving(false);

    if (res.status === 409) {
      setOverlapError(true);
      return;
    }

    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/announcements/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    fetchAll();
  };

  const setField = (field: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <Flex direction="column" px={8} py={6} pb={8}>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="800" letterSpacing="-0.02em">
          Annonces
        </Heading>
        <Button colorPalette="gray" size="lg" fontWeight="600" onClick={openCreate}>
          + Nouvel événement
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">Chargement...</Text>
        </Flex>
      ) : events.length === 0 ? (
        <Flex justify="center" py={20}>
          <Text color="fg.muted" fontSize="lg">Aucun événement. Créez-en un!</Text>
        </Flex>
      ) : (
        <Box borderRadius="xl" border="1px solid" borderColor="border" overflow="hidden">
          <Flex bg="bg.subtle" px={5} py={3} gap={4}>
            <Text flex={3} fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em">Événement</Text>
            <Text flex={2} fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em">Bannière</Text>
            <Text flex={2} fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em">Vente</Text>
            <Text w="80px" fontSize="sm" fontWeight="700" color="fg.muted" textTransform="uppercase" letterSpacing="0.05em" textAlign="center">Billets</Text>
            <Box w="72px" />
          </Flex>

          {events.map((event, i) => {
            const status = getStatus(event);
            const cfg = STATUS_CONFIG[status];
            const productStats = event.product ? stats?.byName[event.product.name] : null;
            return (
              <Box key={event.id}>
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
                    <Text fontWeight="700" fontSize="md" truncate>{event.title}</Text>
                    <Text fontSize="sm" color="fg.muted" truncate>{event.description}</Text>
                    <Text fontSize="xs" fontWeight="600" color={cfg.textColor} mt="2px">{cfg.label}</Text>
                  </Box>
                  <Box flex={2}>
                    <Text fontSize="sm" color={event.bannerStart || event.bannerEnd ? 'fg' : 'fg.muted'}>
                      {formatDateRange(event.bannerStart, event.bannerEnd)}
                    </Text>
                  </Box>
                  <Box flex={2}>
                    {event.product ? (
                      <Text fontSize="sm" color={event.salesStart || event.salesEnd ? 'fg' : 'fg.muted'}>
                        {formatDateRange(event.salesStart, event.salesEnd)}
                      </Text>
                    ) : (
                      <Text fontSize="sm" color="fg.muted">—</Text>
                    )}
                  </Box>
                  <Box w="80px" textAlign="center">
                    {event.product ? (
                      <VStack gap={0}>
                        <Text fontSize="lg" fontWeight="800">{productStats?.qty ?? 0}</Text>
                        {productStats && productStats.qty > 0 && (
                          <Text fontSize="xs" color="fg.muted">{productStats.revenue.toFixed(2)}$</Text>
                        )}
                      </VStack>
                    ) : (
                      <Text color="fg.muted">—</Text>
                    )}
                  </Box>
                  <HStack w="72px" gap={1} justify="flex-end">
                    <IconButton aria-label="Modifier" variant="ghost" size="sm" onClick={() => openEdit(event)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      aria-label="Supprimer"
                      variant="ghost"
                      size="sm"
                      fontSize="md"
                      color="fg.muted"
                      _hover={{ color: 'red.500' }}
                      onClick={() => setDeleteTarget(event)}
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

      {/* Edit / Create modal */}
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
                {editingId ? "Modifier l'événement" : 'Nouvel événement'}
              </DialogTitle>
            </DialogHeader>
            <DialogBody py={0}>
              <VStack gap={5} align="stretch">
                <Box>
                  <Text fontWeight="700" fontSize="sm" mb={2}>Titre</Text>
                  <Input
                    placeholder="ex : Souper de Noël"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    fontSize="md"
                  />
                </Box>

                <Box>
                  <Text fontWeight="700" fontSize="sm" mb={2}>Description</Text>
                  <Textarea
                    placeholder="ex : Vendredi 20 décembre, 18h. Billets disponibles à la cantine."
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    fontSize="sm"
                    rows={2}
                    resize="vertical"
                  />
                </Box>

                <Separator />

                <Box>
                  <Text fontWeight="700" fontSize="sm" mb={1}>Période — Bannière</Text>
                  <Text fontSize="xs" color="fg.muted" mb={3}>La bannière s&apos;affiche sur l&apos;accueil pendant cette période.</Text>
                  <RangePicker
                    start={form.bannerStart}
                    end={form.bannerEnd}
                    onChange={(s, e) => {
                      setField('bannerStart', s);
                      setField('bannerEnd', e);
                      setOverlapError(false);
                    }}
                    onClear={() => {
                      setField('bannerStart', '');
                      setField('bannerEnd', '');
                      setOverlapError(false);
                    }}
                  />
                  {overlapError && (
                    <Text fontSize="sm" color="red.500" mt={2} fontWeight="600">
                      Cette période chevauche un événement existant.
                    </Text>
                  )}
                </Box>

                <Separator />

                <Flex justify="space-between" align="center">
                  <VStack align="start" gap={0}>
                    <Text fontWeight="700" fontSize="sm">Vendre un billet / produit</Text>
                    <Text fontSize="xs" color="fg.muted">Ajoute un bouton d&apos;achat rapide sur l&apos;ardoise</Text>
                  </VStack>
                  <Switch.Root
                    checked={form.hasProduct}
                    onCheckedChange={(e) => setField('hasProduct', e.checked)}
                    colorPalette="green"
                    size="lg"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </Flex>

                {form.hasProduct && (
                  <>
                    <HStack gap={3} align="end">
                      <Box flex={3}>
                        <Text fontWeight="700" fontSize="sm" mb={2}>Nom du produit</Text>
                        <Input
                          placeholder="ex : Billet souper"
                          value={form.productName}
                          onChange={(e) => setField('productName', e.target.value)}
                          fontSize="sm"
                        />
                      </Box>
                      <Box flex={1}>
                        <Text fontWeight="700" fontSize="sm" mb={2}>Prix ($)</Text>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          placeholder="25.00"
                          value={form.productPrice}
                          onChange={(e) => setField('productPrice', e.target.value)}
                          fontSize="sm"
                        />
                      </Box>
                    </HStack>

                    <Box>
                      <Text fontWeight="700" fontSize="sm" mb={1}>Période — Vente de billets</Text>
                      <Text fontSize="xs" color="fg.muted" mb={3}>Le bouton d&apos;achat est visible sur l&apos;ardoise pendant cette période.</Text>
                      <RangePicker
                        start={form.salesStart}
                        end={form.salesEnd}
                        onChange={(s, e) => {
                          setField('salesStart', s);
                          setField('salesEnd', e);
                        }}
                        onClear={() => {
                          setField('salesStart', '');
                          setField('salesEnd', '');
                        }}
                      />
                    </Box>
                  </>
                )}
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
                  disabled={!form.title.trim() || !form.description.trim()}
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
              <DialogTitle fontSize="lg" fontWeight="700">Supprimer l&apos;événement</DialogTitle>
            </DialogHeader>
            <DialogBody py={4}>
              <Text color="fg.muted">
                Supprimer &ldquo;{deleteTarget?.title}&rdquo; ? Cette action est irréversible.
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
