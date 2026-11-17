// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Providers } from '@/app/providers';
import { TicketOptionsEditor, type DraftOption } from './TicketOptionsEditor';

afterEach(cleanup);

const options: DraftOption[] = [
  { key: 'a', id: 'adult', name: 'Adulte', price: '25', description: '' },
  { key: 'c', id: 'child', name: 'Enfant', price: '10', description: '' },
];

describe('TicketOptionsEditor', () => {
  it('flags the removal of an option that already sold tickets', () => {
    const onChange = vi.fn();
    const onRemoveWithSales = vi.fn();
    render(
      <Providers>
        <TicketOptionsEditor
          options={options}
          onChange={onChange}
          soldByOption={{ adult: 3 }}
          removedWithSales={[]}
          onRemoveWithSales={onRemoveWithSales}
        />
      </Providers>
    );

    expect(screen.getByText('3 billets déjà vendus')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Retirer l'option 1" }));

    expect(onRemoveWithSales).toHaveBeenCalledWith({ name: 'Adulte', sold: 3 });
    expect(onChange).toHaveBeenCalledWith([options[1]]);
  });
});
