import type { Announcement, TicketOption } from './entities/announcement.entity';

/**
 * Event tickets: one event sells one or more ticket tiers ("options").
 *
 * Sale lines keep the `_event_` barcode (billed, never inventory tracked) and
 * carry `eventId`/`optionId` so stats survive renames. Lines recorded before
 * options existed only have a name; they are attributed to the event's
 * `LEGACY_OPTION_ID` option by that name, which is what the stats always did.
 */
export const EVENT_BARCODE = '_event_';
export const LEGACY_OPTION_ID = 'legacy';
export const MAX_TICKET_OPTIONS = 8;
export const MAX_OPTION_NAME = 60;
export const MAX_OPTION_DESCRIPTION = 120;
export const MAX_PER_EMPLOYEE = 99;

type StoredAnnouncement = Omit<Announcement, 'options'> & { options?: TicketOption[] | null };

/** Folds the legacy single `product` into `options` so callers see one shape. */
export function normalizeAnnouncement(doc: StoredAnnouncement): Announcement {
  const { product, options, ...rest } = doc;
  if (options && options.length > 0) return { ...rest, options, maxPerEmployee: rest.maxPerEmployee ?? null };
  return {
    ...rest,
    maxPerEmployee: rest.maxPerEmployee ?? null,
    options: product ? [{ id: LEGACY_OPTION_ID, name: product.name, price: product.price, description: null }] : [],
  };
}

/**
 * Name billed on the cart line and shown in history. A lone option keeps its
 * own name, as the single-ticket events always did; several options are
 * prefixed with the event so "Adulte" stays meaningful in a transaction list.
 */
export function ticketLineName(eventTitle: string, option: TicketOption, optionCount: number): string {
  return optionCount > 1 ? `${eventTitle} – ${option.name}` : option.name;
}

/** Tickets the employee may still add; `Infinity` when the event is unlimited. */
export function remainingAllowance(
  maxPerEmployee: number | null | undefined,
  purchased: number,
  inCart: number
): number {
  if (maxPerEmployee == null) return Infinity;
  return Math.max(0, maxPerEmployee - purchased - inCart);
}

export interface OptionFieldErrors {
  name?: string;
  price?: string;
  description?: string;
}

export interface TicketSaleErrors {
  options?: string;
  maxPerEmployee?: string;
  byOption?: Record<number, OptionFieldErrors>;
}

export type TicketSaleResult =
  | { ok: true; value: { options: TicketOption[]; maxPerEmployee: number | null } }
  | { ok: false; errors: TicketSaleErrors };

function parsePrice(raw: unknown): number | null {
  const value = typeof raw === 'string' ? (raw.trim() === '' ? NaN : Number(raw)) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

/**
 * Validates admin input for an event's ticket sale. Pure so the admin form can
 * show the same errors inline that the API would return. Options without an id
 * are new and get one from `newId`; existing ids are kept so past sales stay
 * attributed to the option after an edit.
 */
export function validateTicketSale(
  raw: { options?: unknown; maxPerEmployee?: unknown },
  newId: () => string
): TicketSaleResult {
  const errors: TicketSaleErrors = {};
  const byOption: Record<number, OptionFieldErrors> = {};
  const options: TicketOption[] = [];

  const list = raw.options ?? [];
  if (!Array.isArray(list)) {
    return { ok: false, errors: { options: 'Options invalides.' } };
  }
  if (list.length > MAX_TICKET_OPTIONS) {
    errors.options = `Maximum ${MAX_TICKET_OPTIONS} options.`;
  }

  const seen = new Set<string>();
  list.forEach((entry, index) => {
    const item = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;
    const fieldErrors: OptionFieldErrors = {};

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) fieldErrors.name = 'Nom requis.';
    else if (name.length > MAX_OPTION_NAME) fieldErrors.name = `${MAX_OPTION_NAME} caractères maximum.`;
    else if (seen.has(name.toLocaleLowerCase('fr'))) fieldErrors.name = 'Nom déjà utilisé.';
    if (name) seen.add(name.toLocaleLowerCase('fr'));

    const price = parsePrice(item.price);
    if (price === null) fieldErrors.price = 'Prix invalide.';

    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (description.length > MAX_OPTION_DESCRIPTION) {
      fieldErrors.description = `${MAX_OPTION_DESCRIPTION} caractères maximum.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
      byOption[index] = fieldErrors;
      return;
    }
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : newId();
    options.push({ id, name, price: price as number, description: description || null });
  });

  let maxPerEmployee: number | null = null;
  const rawMax = raw.maxPerEmployee;
  if (rawMax != null && rawMax !== '') {
    const value = typeof rawMax === 'string' ? Number(rawMax) : rawMax;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_PER_EMPLOYEE) {
      errors.maxPerEmployee = `Nombre entier entre 1 et ${MAX_PER_EMPLOYEE}.`;
    } else {
      maxPerEmployee = value;
    }
  }

  if (Object.keys(byOption).length > 0) errors.byOption = byOption;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { options, maxPerEmployee } };
}

/** One aggregated group of `_event_` sale lines. */
export interface TicketRow {
  eventId?: string | null;
  optionId?: string | null;
  name: string;
  qty: number;
  revenue: number;
}

export interface OptionStats {
  name: string;
  qty: number;
  revenue: number;
}

export interface EventTicketStats {
  qty: number;
  revenue: number;
  byOption: Record<string, OptionStats>;
}

/** Resolves which option of `event` a row belongs to, or null if it is not this event's. */
export function resolveTicketOption(
  row: Pick<TicketRow, 'eventId' | 'optionId' | 'name'>,
  event: Pick<Announcement, 'id' | 'options'>
): string | null {
  if (row.eventId) {
    if (row.eventId !== event.id) return null;
    // A removed option keeps its sales under its old id.
    return row.optionId ?? row.name;
  }
  const legacy = event.options.find((o) => o.id === LEGACY_OPTION_ID && o.name === row.name);
  return legacy ? legacy.id : null;
}

/** Names of the event's options that pre-date ids, for matching old ledger lines. */
export function legacyTicketNames(event: Pick<Announcement, 'options'>): string[] {
  return event.options.filter((o) => o.id === LEGACY_OPTION_ID).map((o) => o.name);
}

/** Groups ticket rows per event, then per option. Unattributable rows are dropped. */
export function attributeTicketRows(
  rows: TicketRow[],
  events: Pick<Announcement, 'id' | 'options'>[]
): Record<string, EventTicketStats> {
  const result: Record<string, EventTicketStats> = {};
  for (const row of rows) {
    for (const event of events) {
      if (!event.id) continue;
      const optionId = resolveTicketOption(row, event);
      if (!optionId) continue;

      const stats = (result[event.id] ??= { qty: 0, revenue: 0, byOption: {} });
      const current = event.options.find((o) => o.id === optionId);
      const option = (stats.byOption[optionId] ??= { name: current?.name ?? row.name, qty: 0, revenue: 0 });
      option.qty += row.qty;
      option.revenue = round2(option.revenue + row.revenue);
      stats.qty += row.qty;
      stats.revenue = round2(stats.revenue + row.revenue);
      break;
    }
  }
  return result;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
