import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { NextRequest } from 'next/server';
import { startTestDb, stopTestDb } from '@/test/db';
import { getDb } from '@/lib/infrastructure/db/mongo';
import { createAdminToken } from '@/lib/infrastructure/auth/admin-token';
import {
  MongoThemeRepository,
  themeRepository,
} from '@/lib/infrastructure/repositories/theme.repository.mongo';
import { GET, PUT } from './route';

beforeAll(async () => {
  vi.stubEnv('ADMIN_PIN', '1234');
  vi.stubEnv('BASIC_AUTH_PASSWORD', 'theme-test-password');
  await startTestDb('cantine_theme_tests');
});
beforeEach(async () => {
  await (await getDb()).collection('settings').deleteMany({});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await stopTestDb();
  vi.unstubAllEnvs();
});

function request(body: unknown, authorized = true) {
  return new NextRequest('http://localhost/api/theme', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authorized ? { cookie: `admin_token=${createAdminToken()}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('/api/theme', () => {
  it('defaults to classic without a migration or an admin session', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ theme: 'classic' });
  });

  it.each(['halloween', 'winter'])(
    'persists %s for all clients and allows restoring classic',
    async theme => {
      const response = await PUT(request({ theme }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ theme });
      expect(await new MongoThemeRepository().getTheme()).toBe(theme);
      expect(await (await GET()).json()).toEqual({ theme });

      expect((await PUT(request({ theme: 'classic' }))).status).toBe(200);
      expect(await (await GET()).json()).toEqual({ theme: 'classic' });
      expect(
        await (await getDb()).collection('settings').countDocuments()
      ).toBe(1);
    }
  );

  it('rejects unauthenticated writes without changing the current theme', async () => {
    const response = await PUT(request({ theme: 'halloween' }, false));
    expect(response.status).toBe(401);
    expect(await themeRepository.getTheme()).toBe('classic');
  });

  it.each([
    null,
    [],
    {},
    'halloween',
    { theme: 'unknown' },
    { theme: 1 },
    { theme: '__proto__' },
  ])('rejects invalid input %j', async body => {
    expect((await PUT(request(body))).status).toBe(400);
    expect(await themeRepository.getTheme()).toBe('classic');
  });

  it('rejects malformed JSON', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/theme', {
        method: 'PUT',
        headers: { cookie: `admin_token=${createAdminToken()}` },
        body: '{',
      })
    );
    expect(response.status).toBe(400);
  });

  it('reports corrupt settings instead of disguising them as classic', async () => {
    await (await getDb())
      .collection<{ _id: string; theme: string }>('settings')
      .insertOne({ _id: 'appearance', theme: 'unknown' });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await GET()).status).toBe(500);
    expect(log).toHaveBeenCalled();
  });

  it('reports persistence failures instead of acknowledging a save', async () => {
    vi.spyOn(themeRepository, 'setTheme').mockRejectedValueOnce(
      new Error('offline')
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await PUT(request({ theme: 'halloween' }))).status).toBe(500);
    expect(log).toHaveBeenCalled();
    expect(await themeRepository.getTheme()).toBe('classic');
  });
});
