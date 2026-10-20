import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  startTestDb,
  stopTestDb,
  resetCollections,
  seedEmployee,
  seedTransaction,
  employees,
} from '@/test/db';
import { CASH_CARD_NUMBER } from '@/lib/domain/constants';
import { startOfYearInZone } from '@/lib/domain/leaderboard';
import { GET } from './route';

beforeAll(() => startTestDb('cantine_leaderboard_route_tests'));
afterAll(() => stopTestDb());

const thisYear = () => new Date();
const lastYear = () => new Date(startOfYearInZone(new Date()).getTime() - 1);

async function standingOf(cardNumber: string) {
  const response = await GET(
    new NextRequest(`http://localhost/api/employees/${cardNumber}/leaderboard`),
    { params: Promise.resolve({ cardNumber }) }
  );
  expect(response.status).toBe(200);
  return (await response.json()).standing;
}

beforeEach(async () => {
  await resetCollections();
  for (const card of ['A', 'B', 'C', 'ZERO']) {
    await seedEmployee({ cardNumber: card, employeeNumber: `E-${card}` });
  }
  await seedTransaction({ cardNumber: 'A', totalAmount: 20, timestamp: thisYear() });
  await seedTransaction({ cardNumber: 'A', totalAmount: 10, timestamp: thisYear() });
  await seedTransaction({ cardNumber: 'B', totalAmount: 12.5, timestamp: thisYear() });
  await seedTransaction({ cardNumber: 'C', totalAmount: 5, timestamp: thisYear() });
});

describe('GET /api/employees/:cardNumber/leaderboard', () => {
  it('ranks year-to-date spending and reports the gap to the next rank', async () => {
    expect(await standingOf('B')).toEqual({
      rank: 2,
      participants: 3,
      total: 12.5,
      tied: false,
      gapToNext: 17.5,
      leadOverNext: null,
    });
    expect(await standingOf('A')).toMatchObject({ rank: 1, leadOverNext: 17.5 });
  });

  it('ignores sales from before this year', async () => {
    await seedTransaction({ cardNumber: 'C', totalAmount: 1000, timestamp: lastYear() });
    expect(await standingOf('C')).toMatchObject({ rank: 3, total: 5 });
  });

  it('leaves cash sales out of the ranking', async () => {
    await seedTransaction({ cardNumber: CASH_CARD_NUMBER, totalAmount: 500, timestamp: thisYear() });
    expect(await standingOf('A')).toMatchObject({ rank: 1, participants: 3 });
  });

  it('leaves deleted employees out of the ranking', async () => {
    await (await employees()).deleteOne({ cardNumber: 'A' });
    expect(await standingOf('B')).toMatchObject({ rank: 1, participants: 2, leadOverNext: 7.5 });
  });

  it('has no standing for an employee who spent nothing this year', async () => {
    expect(await standingOf('ZERO')).toBeNull();
  });
});
