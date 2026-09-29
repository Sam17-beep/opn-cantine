import type { ThemeId } from '../theme';

export interface IThemeRepository {
  getTheme(): Promise<ThemeId>;
  setTheme(theme: ThemeId): Promise<void>;
}
