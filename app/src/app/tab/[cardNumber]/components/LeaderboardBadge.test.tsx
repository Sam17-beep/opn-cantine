// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render as renderRaw, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Providers } from '@/app/providers';
import type { LeaderboardStanding } from '@/lib/domain/leaderboard';
import { LeaderboardBadge } from './LeaderboardBadge';

const fetchMock = vi.fn<typeof fetch>();
const render = (ui: ReactElement) => renderRaw(<Providers>{ui}</Providers>);

const standing = (overrides: Partial<LeaderboardStanding>): LeaderboardStanding => ({
  rank: 1,
  participants: 1,
  total: 10,
  tied: false,
  gapToNext: null,
  leadOverNext: null,
  ...overrides,
});

/** Lets the fetch chain resolve and React commit whatever it produced. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function respondWith(body: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('LeaderboardBadge', () => {
  it.each([
    [
      standing({ rank: 3, participants: 42, gapToNext: 4.5 }),
      '🏆 #3 sur 42 · 4.50$ derrière la place au-dessus',
    ],
    [
      standing({ rank: 2, participants: 5, tied: true, gapToNext: 1 }),
      '🏆 #2 ex aequo sur 5 · 1.00$ derrière la place au-dessus',
    ],
    [standing({ participants: 42, leadOverNext: 12 }), "🏆 #1 sur 42 · 12.00$ d'avance"],
    [standing({ participants: 2, tied: true }), '🏆 #1 ex aequo sur 2'],
    [standing({}), '🏆 #1'],
  ])('shows the standing %#', async (s, label) => {
    respondWith({ standing: s });
    render(<LeaderboardBadge cardNumber="A" />);
    expect(await screen.findByText(label)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/employees/A/leaderboard');
  });

  it('renders nothing for an employee without spending', async () => {
    respondWith({ standing: null });
    const { container } = render(<LeaderboardBadge cardNumber="A" />);
    await settle();
    expect(container.textContent).not.toContain('🏆');
  });

  it('renders nothing when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { container } = render(<LeaderboardBadge cardNumber="A" />);
    await settle();
    expect(container.textContent).not.toContain('🏆');
  });
});
