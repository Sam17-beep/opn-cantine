'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import type { LeaderboardStanding } from '@/lib/domain/leaderboard';

const pop = keyframes`
  0% { opacity: 0; transform: translateX(-50%) scale(0.3); }
  20% { opacity: 1; transform: translateX(-50%) scale(1.15); }
  30% { transform: translateX(-50%) scale(1); }
  85% { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(0.9) translateY(-1rem); }
`;
const burst = keyframes`
  0% { opacity: 1; transform: translate(0, 0) rotate(0); }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.12); }
`;

const OVERTAKE_MS = 2200;
const COLORS = ['#f6c343', '#ef476f', '#06d6a0', '#118ab2', '#ff9f1c', '#9b5de5'];
// Fixed, not random: stable between renders and servers.
const CONFETTI = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 2 * Math.PI;
  const reach = 22 + (i % 3) * 8; // vmin, so it scales with either iPad orientation
  return {
    dx: `${Math.round(Math.cos(angle) * reach * 10) / 10}vmin`,
    dy: `${Math.round(Math.sin(angle) * reach * 10) / 10}vmin`,
    rot: `${(i % 2 ? 1 : -1) * (180 + i * 30)}deg`,
    color: COLORS[i % COLORS.length],
  };
});

const reduceMotion = {
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const money = (amount: number) => `${amount.toFixed(2)}$`;

export function leaderboardLabel(s: LeaderboardStanding): string {
  const position = `Classement ${s.rank}${s.tied ? ' ex aequo' : ''}`;
  if (s.gapsAbove.length > 0)
    return `${position} · ${money(s.gapsAbove[0])} derrière la place au-dessus`;
  if (s.leadOverNext !== null) return `${position} · ${money(s.leadOverNext)} d'avance`;
  return position;
}

/** The employee's year-to-date spending rank; renders nothing until there is one. */
export function LeaderboardBadge({
  cardNumber,
  pendingTotal = 0,
}: {
  cardNumber: string;
  pendingTotal?: number;
}) {
  const [standing, setStanding] = useState<LeaderboardStanding | null>(null);
  // Bumped on every new pass; keys the overlay so the animation replays.
  const [celebration, setCelebration] = useState(0);
  const lastPassed = useRef(0);

  const passed = standing ? standing.gapsAbove.filter((gap) => pendingTotal > gap).length : 0;
  useEffect(() => {
    if (passed > lastPassed.current) setCelebration((n) => n + 1);
    lastPassed.current = passed;
  }, [passed]);
  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(0), OVERTAKE_MS);
    return () => clearTimeout(t);
  }, [celebration]);

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

  const passing = passed > 0;
  const shownRank = standing.rank - passed;
  const nextGap = standing.gapsAbove[passed];

  return (
    <>
      <Text
        aria-label="Classement des dépenses de l'année"
        fontSize={{ base: 'sm', md: 'md' }}
        fontWeight="600"
        color={passing ? 'green.500' : 'fg.muted'}
        key={`pulse-${celebration}`}
        animation={celebration ? `${pulse} 0.6s ease-out 2` : undefined}
        css={reduceMotion}
      >
        {!passing
          ? `🏆 ${leaderboardLabel(standing)}`
          : nextGap !== undefined
            ? `🏆 Classement ${shownRank} · ${money(nextGap - pendingTotal)} derrière la place au-dessus`
            : `🏆 Classement ${shownRank}`}
      </Text>
      {celebration > 0 && (
        <Box
          key={`burst-${celebration}`}
          aria-hidden
          data-testid="overtake"
          position="fixed"
          inset="0"
          pointerEvents="none"
          zIndex="toast"
          overflow="hidden"
        >
          <Box
            position="absolute"
            top="18%"
            left="50%"
            px="8"
            py="4"
            rounded="3xl"
            bg="green.500"
            color="white"
            fontWeight="800"
            lineHeight="1.2"
            w="max-content"
            maxW="90vw"
            textAlign="center"
            fontSize="clamp(1.5rem, 6vmin, 3.25rem)"
            shadow="lg"
            animation={`${pop} ${OVERTAKE_MS}ms ease-out forwards`}
          >
            Classement {standing.rank} → {shownRank}
          </Box>
          <Box
            position="absolute"
            top="18%"
            left="50%"
            css={{
              '@media (prefers-reduced-motion: reduce)': { display: 'none' },
            }}
          >
            {CONFETTI.map((c, i) => (
              <Box
                key={i}
                position="absolute"
                w="1.2vmin"
                h="2.2vmin"
                bg={c.color}
                rounded="sm"
                style={
                  {
                    '--dx': c.dx,
                    '--dy': c.dy,
                    '--rot': c.rot,
                  } as React.CSSProperties
                }
                animation={`${burst} 1.4s ease-out ${(i % 4) * 0.05}s forwards`}
              />
            ))}
          </Box>
        </Box>
      )}
    </>
  );
}
