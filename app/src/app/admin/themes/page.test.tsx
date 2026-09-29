// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemesPage from './page';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  delete document.documentElement.dataset.appTheme;
  delete document.documentElement.dataset.theme;
});

function mount() {
  render(
    <Providers>
      <ThemeProvider>
        <ThemesPage />
      </ThemeProvider>
    </Providers>
  );
}

it.each([
  { theme: 'halloween', description: /Une nuit d’Halloween/ },
  { theme: 'winter', description: /Un décor enneigé/ },
])(
  'previews $theme without applying it, saves explicitly, and can restore classic',
  async ({ theme, description }) => {
    fetchMock.mockResolvedValueOnce(new Response('{"theme":"classic"}'));
    mount();
    const select = screen.getByRole<HTMLSelectElement>('combobox', {
      name: 'Thème de l’application',
    });
    await waitFor(() => expect(select.disabled).toBe(false));
    const apply = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Appliquer le thème',
    });
    expect(apply.disabled).toBe(true);
    fireEvent.change(select, { target: { value: theme } });
    expect(screen.getByText(description)).toBeTruthy();
    expect(document.documentElement.dataset.appTheme).toBe('classic');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ theme })));
    fireEvent.click(apply);
    await screen.findByText(/Thème enregistré/);
    expect(document.documentElement.dataset.appTheme).toBe(theme);
    expect(apply.disabled).toBe(true);

    fireEvent.change(select, { target: { value: 'classic' } });
    fetchMock.mockResolvedValueOnce(new Response('{"theme":"classic"}'));
    fireEvent.click(apply);
    await waitFor(() =>
      expect(document.documentElement.dataset.appTheme).toBe('classic')
    );
  }
);

it('disables saving when loading fails and exposes a retry', async () => {
  fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mount();
  await screen.findByRole('alert');
  expect(screen.getByRole<HTMLSelectElement>('combobox').disabled).toBe(true);
  expect(
    screen.getByRole<HTMLButtonElement>('button', {
      name: 'Appliquer le thème',
    }).disabled
  ).toBe(true);
  fetchMock.mockResolvedValueOnce(new Response('{"theme":"halloween"}'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Réessayer la synchronisation' })
  );
  await waitFor(() =>
    expect(screen.getByRole<HTMLSelectElement>('combobox').disabled).toBe(false)
  );
  expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe(
    'halloween'
  );
});
