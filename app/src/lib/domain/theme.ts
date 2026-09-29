export const THEMES = [
  {
    id: 'classic',
    label: 'Classique',
    description: 'Le style habituel de la cantine, sobre et lumineux.',
    colorMode: 'light',
    themeColor: '#ffffff',
  },
  {
    id: 'halloween',
    label: 'Halloween',
    description:
      'Une nuit d’Halloween : citrouilles, épouvantail et chauves-souris sur fond prune sombre.',
    colorMode: 'dark',
    themeColor: '#18121e',
  },
  {
    id: 'winter',
    label: 'Hiver / Noël',
    description:
      'Un décor enneigé avec un sapin illuminé, un bonhomme de neige et des cadeaux.',
    colorMode: 'light',
    themeColor: '#edf6fb',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'classic';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some(theme => theme.id === value);
}

export function getThemeDefinition(id: ThemeId) {
  const theme = THEMES.find(theme => theme.id === id);
  if (!theme) throw new Error(`Invalid theme: ${id}`);
  return theme;
}
