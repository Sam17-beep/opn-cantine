import { DEFAULT_THEME, isThemeId, type ThemeId } from '@/lib/domain/theme';
import type { IThemeRepository } from '@/lib/domain/ports/theme.repository.port';
import { getDb } from '../db/mongo';

interface ThemeDocument {
  _id: string;
  theme: ThemeId;
}

export class MongoThemeRepository implements IThemeRepository {
  private async collection() {
    return (await getDb()).collection<ThemeDocument>('settings');
  }

  async getTheme(): Promise<ThemeId> {
    const doc = await (await this.collection()).findOne({ _id: 'appearance' });
    if (!doc) return DEFAULT_THEME;
    if (!isThemeId(doc.theme)) throw new Error('Invalid stored theme');
    return doc.theme;
  }

  async setTheme(theme: ThemeId): Promise<void> {
    if (!isThemeId(theme)) throw new Error('Invalid theme');
    await (
      await this.collection()
    ).updateOne({ _id: 'appearance' }, { $set: { theme } }, { upsert: true });
  }
}

export const themeRepository = new MongoThemeRepository();
