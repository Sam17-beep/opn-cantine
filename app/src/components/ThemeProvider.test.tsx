// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

const fetchMock = vi.fn<typeof fetch>();

function response(theme: string) {
  return new Response(JSON.stringify({ theme }));
}

function Controls() {
  const { theme, loaded, saving, error, refresh, saveTheme } = useTheme();
  return (
    <>
      <output>{loaded ? theme : 'loading'}</output>
      <p role="alert">{error}</p>
      <button onClick={() => void refresh()}>Refresh</button>
      <button disabled={saving} onClick={() => void saveTheme('halloween')}>
        Halloween
      </button>
      <button disabled={saving} onClick={() => void saveTheme('classic')}>
        Classic
      </button>
      <button disabled={saving} onClick={() => void saveTheme('winter')}>
        Winter
      </button>
    </>
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff">';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fetchMock.mockReset();
  delete document.documentElement.dataset.appTheme;
  delete document.documentElement.dataset.theme;
});

function mount() {
  return render(
    <ThemeProvider>
      <Controls />
    </ThemeProvider>
  );
}

describe('ThemeProvider', () => {
  it.each([
    { theme: 'halloween', mode: 'dark', color: '#18121e' },
    { theme: 'winter', mode: 'light', color: '#edf6fb' },
  ])(
    'loads $theme and restores all classic hooks on a successful save',
    async ({ theme, mode, color }) => {
      fetchMock.mockResolvedValueOnce(response(theme));
      mount();
      await screen.findByText(theme);
      expect(document.documentElement.dataset.appTheme).toBe(theme);
      expect(document.documentElement.dataset.theme).toBe(mode);
      expect(
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute('content')
      ).toBe(color);

      fetchMock.mockResolvedValueOnce(response('classic'));
      fireEvent.click(screen.getByText('Classic'));
      await waitFor(() =>
        expect(document.documentElement.dataset.appTheme).toBe('classic')
      );
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute('content')
      ).toBe('#ffffff');
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/theme',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ theme: 'classic' }),
        })
      );
    }
  );

  it('clears Halloween dark mode when winter is saved and restores it when switched back', async () => {
    fetchMock.mockResolvedValueOnce(response('halloween'));
    mount();
    await screen.findByText('halloween');

    fetchMock.mockResolvedValueOnce(response('winter'));
    fireEvent.click(screen.getByText('Winter'));
    await screen.findByText('winter');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(
      document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute('content')
    ).toBe('#edf6fb');

    fetchMock.mockResolvedValueOnce(response('halloween'));
    fireEvent.click(screen.getByText('Halloween'));
    await screen.findByText('halloween');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('does not apply an unsaved theme and surfaces an expired admin session', async () => {
    fetchMock.mockResolvedValueOnce(response('classic'));
    mount();
    await screen.findByText('classic');
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Halloween'));
    await screen.findByText(/Session expirée/);
    expect(document.documentElement.dataset.appTheme).toBe('classic');
  });

  it('retains the last loaded theme on a failed refresh and supports retry', async () => {
    fetchMock.mockResolvedValueOnce(response('halloween'));
    mount();
    await screen.findByText('halloween');
    fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Refresh'));
    await screen.findByText('Network unavailable');
    expect(document.documentElement.dataset.appTheme).toBe('halloween');

    fetchMock.mockResolvedValueOnce(response('classic'));
    fireEvent.click(screen.getByText('Refresh'));
    await screen.findByText('classic');
    expect(screen.getByRole('alert').textContent).toBe('');
  });

  it('rejects unknown server themes', async () => {
    fetchMock.mockResolvedValueOnce(response('not-a-theme'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    await screen.findByText(/thème invalide/);
    expect(document.documentElement.dataset.appTheme).toBe('classic');
    expect(screen.getByText('loading')).toBeTruthy();
  });

  it('does not let an older read overwrite a completed save', async () => {
    let finishRead!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise(resolve => {
        finishRead = resolve;
      })
    );
    mount();
    fetchMock.mockResolvedValueOnce(response('halloween'));
    fireEvent.click(screen.getByText('Halloween'));
    await screen.findByText('halloween');
    await act(async () => {
      finishRead(response('classic'));
    });
    expect(document.documentElement.dataset.appTheme).toBe('halloween');
  });

  it('refreshes on focus and every minute and removes listeners on unmount', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => response('halloween'));
    const mounted = mount();
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    mounted.unmount();
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
