// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Providers } from '@/app/providers';
import { TicketPickerModal } from './TicketPickerModal';

afterEach(cleanup);

const event = {
  title: 'Gala',
  options: [
    { id: 'adult', name: 'Adulte', price: 25, description: 'Repas complet' },
    { id: 'child', name: 'Enfant', price: 10 },
  ],
  maxPerEmployee: 4,
};

function renderPicker(onConfirm = vi.fn()) {
  render(
    <Providers>
      <TicketPickerModal
        open
        event={event}
        purchased={{ total: 1, byOption: { adult: 1 } }}
        inCart={1}
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    </Providers>
  );
  return onConfirm;
}

const add = (name: string) => fireEvent.click(screen.getByRole('button', { name: `Ajouter un billet ${name}` }));

describe('TicketPickerModal', () => {
  it('adds the chosen quantities per option with a live subtotal', () => {
    const onConfirm = renderPicker();

    add('Adulte');
    add('Enfant');

    const confirm = screen.getByRole('button', { name: 'Ajouter 2 billets · 35.00$' });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ adult: 1, child: 1 });
  });

  it('stops adding once the per-employee limit is reached, counting past and cart tickets', () => {
    renderPicker();
    expect(screen.getByText('Il vous reste 2 billets (max 4 par personne)')).toBeTruthy();

    add('Enfant');
    add('Enfant');

    expect(screen.getByText('Limite de 4 billets par personne atteinte')).toBeTruthy();
    for (const name of ['Adulte', 'Enfant']) {
      expect(screen.getByRole('button', { name: `Ajouter un billet ${name}` }).hasAttribute('disabled')).toBe(true);
    }
  });

  it('cannot confirm an empty selection', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Ajouter' }).hasAttribute('disabled')).toBe(true);
  });
});
