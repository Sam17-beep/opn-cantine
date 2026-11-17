import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/infrastructure/db/mongo';
import { createAdminToken } from '@/lib/infrastructure/auth/admin-token';
import { startTestDb, stopTestDb, resetCollections, seedEmployee, transactions } from '@/test/db';
import { GET as getCurrent } from './route';
import { GET as getStats } from './stats/route';
import { GET as getBuyers } from './buyers/route';
import { POST as createEvent } from '../announcements/route';
import { PATCH as updateEvent } from '../announcements/[id]/route';

const CARD = '000000000001';
const OTHER = '000000000002';
const GALA = new ObjectId();
const BBQ = new ObjectId();

beforeAll(async () => {
  process.env.ADMIN_PIN = '1234';
  process.env.BASIC_AUTH_PASSWORD = 'secret';
  await startTestDb('cantine_announcement_tests');
});
afterAll(() => stopTestDb());

let saleCount = 0;
async function sell(cardNumber: string, items: Record<string, unknown>[]) {
  saleCount++;
  await (await transactions()).insertOne({
    _id: `sale-${saleCount}`,
    cardNumber,
    timestamp: new Date(),
    totalAmount: 0,
    items: items.map((i) => ({ barcode: '_event_', productId: null, ...i })),
  });
}

beforeEach(async () => {
  await resetCollections();
  const announcements = (await getDb()).collection('announcements');
  await announcements.deleteMany({});
  await announcements.insertMany([
    {
      _id: GALA,
      title: 'Gala',
      description: 'd',
      bannerStart: '2000-01-01',
      bannerEnd: null,
      salesStart: '2000-01-01',
      salesEnd: null,
      options: [
        { id: 'adult', name: 'Adulte', price: 25 },
        { id: 'child', name: 'Enfant', price: 10 },
      ],
      maxPerEmployee: 4,
    },
    // Stored before ticket options existed.
    { _id: BBQ, title: 'BBQ', description: 'd', bannerStart: null, product: { name: 'Billet BBQ', price: 5 } },
  ] as never);
  await seedEmployee({ cardNumber: CARD, employeeNumber: 'E1' });
  await seedEmployee({ cardNumber: OTHER, employeeNumber: 'E2' });

  await sell(CARD, [
    { name: 'Gala – Adulte', price: 25, quantity: 2, eventId: GALA.toHexString(), optionId: 'adult' },
    { name: 'Gala – Enfant', price: 10, quantity: 1, eventId: GALA.toHexString(), optionId: 'child' },
  ]);
  await sell(OTHER, [{ name: 'Gala – Enfant', price: 10, quantity: 3, eventId: GALA.toHexString(), optionId: 'child' }]);
  await sell(CARD, [{ name: 'Billet BBQ', price: 5, quantity: 2 }]);
});

const admin = () => ({ 'x-admin-token': createAdminToken() as string, 'content-type': 'application/json' });

async function call(handler: (r: NextRequest, ctx?: never) => Promise<Response>, url: string, init?: RequestInit, ctx?: unknown) {
  const res = await handler(new NextRequest(`http://localhost${url}`, init as never), ctx as never);
  return { status: res.status, body: await res.json() };
}

describe('GET /api/announcement', () => {
  it('returns the current event with what this employee already bought, per option', async () => {
    const { body } = await call(getCurrent as never, `/api/announcement?cardNumber=${CARD}`);

    expect(body.options).toHaveLength(2);
    expect(body.maxPerEmployee).toBe(4);
    expect(body.purchased).toEqual({ total: 3, byOption: { adult: 2, child: 1 } });
    expect(body.purchasedQty).toBe(3);
  });
});

describe('GET /api/announcement/stats', () => {
  it('breaks sales down per event and option, legacy lines included', async () => {
    const { body } = await call(getStats as never, '/api/announcement/stats', { headers: admin() });

    expect(body.byEvent[GALA.toHexString()]).toEqual({
      qty: 6,
      revenue: 90,
      byOption: {
        adult: { name: 'Adulte', qty: 2, revenue: 50 },
        child: { name: 'Enfant', qty: 4, revenue: 40 },
      },
    });
    expect(body.byEvent[BBQ.toHexString()]).toEqual({
      qty: 2,
      revenue: 10,
      byOption: { legacy: { name: 'Billet BBQ', qty: 2, revenue: 10 } },
    });
    expect(body.total).toEqual({ qty: 8, revenue: 100 });
  });
});

describe('GET /api/announcement/buyers', () => {
  it('lists buyers of one event with their per-option quantities', async () => {
    const { body } = await call(getBuyers as never, `/api/announcement/buyers?eventId=${GALA.toHexString()}`, {
      headers: admin(),
    });

    expect(body.buyers).toEqual([
      { employeeNumber: 'E1', qty: 3, revenue: 60, byOption: { adult: 2, child: 1 } },
      { employeeNumber: 'E2', qty: 3, revenue: 30, byOption: { child: 3 } },
    ]);
  });
});

describe('POST/PATCH /api/announcements', () => {
  it('rejects invalid ticket options with per-option errors', async () => {
    const { status, body } = await call(createEvent as never, '/api/announcements', {
      method: 'POST',
      headers: admin(),
      body: JSON.stringify({ title: 'T', description: 'D', options: [{ name: '', price: 5 }] }),
    });

    expect(status).toBe(400);
    expect(body.errors.byOption[0].name).toBeDefined();
  });

  it('creates an event with options and assigns their ids', async () => {
    const { status, body } = await call(createEvent as never, '/api/announcements', {
      method: 'POST',
      headers: admin(),
      body: JSON.stringify({
        title: 'Souper',
        description: 'D',
        options: [{ name: 'Adulte', price: '25' }, { name: 'Enfant', price: 10, description: '< 12 ans' }],
        maxPerEmployee: 2,
      }),
    });

    expect(status).toBe(201);
    expect(body.maxPerEmployee).toBe(2);
    expect(body.options).toEqual([
      { id: expect.any(String), name: 'Adulte', price: 25, description: null },
      { id: expect.any(String), name: 'Enfant', price: 10, description: '< 12 ans' },
    ]);
  });

  it('converts a legacy event to options on edit, keeping the legacy id', async () => {
    const id = BBQ.toHexString();
    const { status, body } = await call(
      updateEvent as never,
      `/api/announcements/${id}`,
      {
        method: 'PATCH',
        headers: admin(),
        body: JSON.stringify({
          title: 'BBQ',
          description: 'd',
          options: [{ id: 'legacy', name: 'Billet BBQ', price: 5 }, { name: 'Végé', price: 6 }],
        }),
      },
      { params: Promise.resolve({ id }) }
    );

    expect(status).toBe(200);
    expect(body.options.map((o: { id: string }) => o.id)[0]).toBe('legacy');
    const stored = await (await getDb()).collection('announcements').findOne({ _id: BBQ });
    expect(stored).not.toHaveProperty('product');
  });
});
