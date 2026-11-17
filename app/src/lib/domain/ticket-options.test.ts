import { describe, it, expect } from 'vitest';
import {
  LEGACY_OPTION_ID,
  attributeTicketRows,
  normalizeAnnouncement,
  remainingAllowance,
  ticketLineName,
  validateTicketSale,
} from './ticket-options';

const ids = () => {
  let n = 0;
  return () => `new-${++n}`;
};

describe('normalizeAnnouncement', () => {
  it('reads a legacy single product as one legacy option', () => {
    const event = normalizeAnnouncement({
      title: 'BBQ',
      description: 'd',
      product: { name: 'Billet BBQ', price: 5 },
    });
    expect(event.options).toEqual([
      { id: LEGACY_OPTION_ID, name: 'Billet BBQ', price: 5, description: null },
    ]);
    expect(event).not.toHaveProperty('product');
  });

  it('prefers stored options over a leftover product', () => {
    const options = [{ id: 'a', name: 'Adulte', price: 25 }];
    const event = normalizeAnnouncement({ title: 't', description: 'd', options, product: { name: 'x', price: 1 } });
    expect(event.options).toBe(options);
  });

  it('gives events that sell nothing an empty list', () => {
    expect(normalizeAnnouncement({ title: 't', description: 'd', product: null }).options).toEqual([]);
  });
});

describe('ticketLineName', () => {
  const adult = { id: 'a', name: 'Adulte', price: 25 };
  it('keeps a lone option name as-is', () => {
    expect(ticketLineName('Gala', adult, 1)).toBe('Adulte');
  });
  it('prefixes the event title when there are several options', () => {
    expect(ticketLineName('Gala', adult, 2)).toBe('Gala – Adulte');
  });
});

describe('remainingAllowance', () => {
  it('is unlimited without a max', () => {
    expect(remainingAllowance(null, 10, 10)).toBe(Infinity);
  });
  it('subtracts purchased and in-cart tickets, never below zero', () => {
    expect(remainingAllowance(4, 1, 2)).toBe(1);
    expect(remainingAllowance(4, 3, 3)).toBe(0);
  });
});

describe('validateTicketSale', () => {
  it('trims, parses string prices, keeps ids and assigns new ones', () => {
    const result = validateTicketSale(
      {
        options: [
          { id: 'keep', name: ' Adulte ', price: '25', description: '  ' },
          { name: 'Enfant', price: 10.555, description: 'Moins de 12 ans' },
        ],
        maxPerEmployee: '4',
      },
      ids()
    );
    expect(result).toEqual({
      ok: true,
      value: {
        options: [
          { id: 'keep', name: 'Adulte', price: 25, description: null },
          { id: 'new-1', name: 'Enfant', price: 10.56, description: 'Moins de 12 ans' },
        ],
        maxPerEmployee: 4,
      },
    });
  });

  it('accepts no options and no limit', () => {
    expect(validateTicketSale({}, ids())).toEqual({ ok: true, value: { options: [], maxPerEmployee: null } });
  });

  it('reports per-option errors by index', () => {
    const result = validateTicketSale(
      { options: [{ name: 'Adulte', price: 25 }, { name: 'adulte', price: -1 }, { name: '', price: '' }] },
      ids()
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        byOption: {
          1: { name: 'Nom déjà utilisé.', price: 'Prix invalide.' },
          2: { name: 'Nom requis.', price: 'Prix invalide.' },
        },
      },
    });
  });

  it.each([0, 1.5, 'abc', 100])('rejects max per employee %s', (maxPerEmployee) => {
    const result = validateTicketSale({ options: [], maxPerEmployee }, ids());
    expect(result.ok).toBe(false);
  });

  it('caps the number of options', () => {
    const options = Array.from({ length: 9 }, (_, i) => ({ name: `O${i}`, price: 1 }));
    const result = validateTicketSale({ options }, ids());
    expect(result.ok).toBe(false);
  });
});

describe('attributeTicketRows', () => {
  const gala = {
    id: 'gala',
    options: [
      { id: 'adult', name: 'Adulte', price: 25 },
      { id: 'child', name: 'Enfant', price: 10 },
    ],
  };
  const bbq = { id: 'bbq', options: [{ id: LEGACY_OPTION_ID, name: 'Billet BBQ', price: 5 }] };

  it('groups rows per event and option, using current option names', () => {
    const stats = attributeTicketRows(
      [
        { eventId: 'gala', optionId: 'adult', name: 'Gala – Adult (old name)', qty: 2, revenue: 50 },
        { eventId: 'gala', optionId: 'child', name: 'Gala – Enfant', qty: 1, revenue: 10 },
        { eventId: 'gala', optionId: 'removed', name: 'Gala – VIP', qty: 1, revenue: 40 },
      ],
      [gala, bbq]
    );
    expect(stats).toEqual({
      gala: {
        qty: 4,
        revenue: 100,
        byOption: {
          adult: { name: 'Adulte', qty: 2, revenue: 50 },
          child: { name: 'Enfant', qty: 1, revenue: 10 },
          removed: { name: 'Gala – VIP', qty: 1, revenue: 40 },
        },
      },
    });
  });

  it('attributes pre-option lines by name to the legacy option only', () => {
    const stats = attributeTicketRows(
      [
        { name: 'Billet BBQ', qty: 3, revenue: 15 },
        { name: 'Adulte', qty: 1, revenue: 25 },
      ],
      [gala, bbq]
    );
    expect(stats).toEqual({
      bbq: { qty: 3, revenue: 15, byOption: { legacy: { name: 'Billet BBQ', qty: 3, revenue: 15 } } },
    });
  });
});
