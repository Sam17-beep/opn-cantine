import type { Document } from 'mongodb';
import type { Announcement } from '@/lib/domain/entities/announcement.entity';
import { EVENT_BARCODE, legacyTicketNames, type TicketRow } from '@/lib/domain/ticket-options';
import { getDb } from '../db/mongo';

export interface CardTicketRow extends TicketRow {
  cardNumber: string;
}

/** Ledger filter (after `$unwind: '$items'`) for one event's ticket lines, legacy ones included. */
function eventLinesFilter(event: Pick<Announcement, 'id' | 'options'>): Document {
  return {
    'items.barcode': EVENT_BARCODE,
    $or: [
      { 'items.eventId': event.id },
      { 'items.eventId': null, 'items.name': { $in: legacyTicketNames(event) } },
    ],
  };
}

async function aggregate(match: Document, cardFilter?: string): Promise<CardTicketRow[]> {
  const db = await getDb();
  const rows = await db
    .collection('transactions')
    .aggregate<{
      _id: { cardNumber: string; eventId?: string | null; optionId?: string | null; name: string };
      qty: number;
      revenue: number;
    }>([
      ...(cardFilter ? [{ $match: { cardNumber: cardFilter } }] : []),
      { $unwind: '$items' },
      { $match: match },
      {
        $group: {
          _id: {
            cardNumber: '$cardNumber',
            eventId: '$items.eventId',
            optionId: '$items.optionId',
            name: '$items.name',
          },
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
    ])
    .toArray();
  return rows.map((row) => ({ ...row._id, qty: row.qty, revenue: row.revenue }));
}

/** Every ticket line ever sold, grouped by buyer, event, option and line name. */
export function allTicketRows(): Promise<CardTicketRow[]> {
  return aggregate({ 'items.barcode': EVENT_BARCODE });
}

/** One event's ticket lines, optionally for a single card. */
export function eventTicketRows(
  event: Pick<Announcement, 'id' | 'options'>,
  cardNumber?: string
): Promise<CardTicketRow[]> {
  return aggregate(eventLinesFilter(event), cardNumber);
}
