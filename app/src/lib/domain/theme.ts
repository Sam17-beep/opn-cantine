export const THEMES = [
  {
    id: 'classic',
    label: 'Classique',
    description: 'Le style habituel de la cantine, sobre et lumineux.',
  },
  {
    id: 'halloween',
    label: 'Halloween',
    description:
      'Une nuit d’Halloween : citrouilles, épouvantail et chauves-souris sur fond prune sombre.',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'classic';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some(theme => theme.id === value);
}
