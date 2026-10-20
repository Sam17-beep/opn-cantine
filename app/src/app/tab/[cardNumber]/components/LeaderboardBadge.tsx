'use client';

import { useEffect, useState } from 'react';
import { Text } from '@chakra-ui/react';
import type { LeaderboardStanding } from '@/lib/domain/leaderboard';

const money = (amount: number) => `${amount.toFixed(2)}$`;

export function leaderboardLabel(s: LeaderboardStanding): string {
  const rank = `#${s.rank}${s.tied ? ' ex aequo' : ''}`;
  const position = s.participants > 1 ? `${rank} sur ${s.participants}` : rank;
  if (s.gapToNext !== null) return `${position} · ${money(s.gapToNext)} derrière la place au-dessus`;
  if (s.leadOverNext !== null) return `${position} · ${money(s.leadOverNext)} d'avance`;
  return position;
}

/** The employee's year-to-date spending rank; renders nothing until there is one. */
export function LeaderboardBadge({ cardNumber }: { cardNumber: string }) {
  const [standing, setStanding] = useState<LeaderboardStanding | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/employees/${encodeURIComponent(cardNumber)}/leaderboard`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { standing: LeaderboardStanding | null } | null) => {
        if (active) setStanding(data?.standing ?? null);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [cardNumber]);

  if (!standing) return null;

  return (
    <Text
      aria-label="Classement des dépenses de l'année"
      fontSize={{ base: 'sm', md: 'md' }}
      fontWeight="600"
      color="fg.muted"
    >
      🏆 {leaderboardLabel(standing)}
    </Text>
  );
}
