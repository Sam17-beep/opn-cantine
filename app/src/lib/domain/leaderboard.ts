/** The canteen's year starts on Jan 1 local time, not UTC. */
export const LEADERBOARD_TIME_ZONE = 'America/Toronto';

export interface SpendingTotal {
  cardNumber: string;
  total: number;
}

export interface LeaderboardStanding {
  /** Competition rank (1, 2, 2, 4), 1-based. */
  rank: number;
  /** Everyone ranked, i.e. with spending above zero. */
  participants: number;
  total: number;
  /** True when someone else has the exact same total. */
  tied: boolean;
  /** Amount behind the nearest strictly higher total; null when ranked first. */
  gapToNext: number | null;
  /** Amount ahead of the nearest strictly lower total; only set when ranked first. */
  leadOverNext: number | null;
}

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Milliseconds the zone is ahead of UTC at the given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant Jan 1 00:00 begins, in `timeZone`, for the year `now` falls in there. */
export function startOfYearInZone(now: Date, timeZone: string = LEADERBOARD_TIME_ZONE): Date {
  const { year } = zonedParts(now, timeZone);
  const midnightAsUtc = Date.UTC(year, 0, 1);
  return new Date(midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc), timeZone));
}

/**
 * Where `cardNumber` stands among `totals`. Returns null when the card has
 * nothing to rank (absent or zero spending).
 */
export function computeStanding(
  totals: SpendingTotal[],
  cardNumber: string
): LeaderboardStanding | null {
  const ranked = totals
    .map((t) => ({ cardNumber: t.cardNumber, cents: toCents(t.total) }))
    .filter((t) => t.cents > 0);

  const mine = ranked.find((t) => t.cardNumber === cardNumber);
  if (!mine) return null;

  let higher = 0;
  let nearestHigher: number | null = null;
  let nearestLower: number | null = null;
  let tied = false;

  for (const other of ranked) {
    if (other.cardNumber === cardNumber) continue;
    if (other.cents > mine.cents) {
      higher++;
      if (nearestHigher === null || other.cents < nearestHigher) nearestHigher = other.cents;
    } else if (other.cents < mine.cents) {
      if (nearestLower === null || other.cents > nearestLower) nearestLower = other.cents;
    } else {
      tied = true;
    }
  }

  const rank = higher + 1;
  return {
    rank,
    participants: ranked.length,
    total: fromCents(mine.cents),
    tied,
    gapToNext: nearestHigher === null ? null : fromCents(nearestHigher - mine.cents),
    leadOverNext:
      rank === 1 && nearestLower !== null ? fromCents(mine.cents - nearestLower) : null,
  };
}
