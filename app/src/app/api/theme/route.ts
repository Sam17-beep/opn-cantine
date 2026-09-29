import { NextRequest, NextResponse } from 'next/server';
import { isThemeId } from '@/lib/domain/theme';
import {
  unauthorizedResponse,
  verifyAdminRequest,
} from '@/lib/infrastructure/auth/admin-token';
import { themeRepository } from '@/lib/infrastructure/repositories/theme.repository.mongo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const theme = await themeRepository.getTheme();
    return NextResponse.json(
      { theme },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Failed to load app theme:', error);
    return NextResponse.json(
      { error: 'Impossible de charger le thème.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('theme' in body) ||
    !isThemeId(body.theme)
  ) {
    return NextResponse.json({ error: 'Thème invalide.' }, { status: 400 });
  }

  try {
    await themeRepository.setTheme(body.theme);
    return NextResponse.json({ theme: body.theme });
  } catch (error) {
    console.error('Failed to save app theme:', error);
    return NextResponse.json(
      { error: 'Impossible d’enregistrer le thème.' },
      { status: 500 }
    );
  }
}
