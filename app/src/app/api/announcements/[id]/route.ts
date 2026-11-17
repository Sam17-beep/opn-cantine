import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';
import { validateTicketSale } from '@/lib/domain/ticket-options';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const { title, description, bannerStart, bannerEnd, salesStart, salesEnd } = body;

  // A body without `options` (e.g. a stale admin page) leaves the ticket sale untouched.
  const touchesTickets = 'options' in body || 'maxPerEmployee' in body;
  const tickets = touchesTickets
    ? validateTicketSale(body, randomUUID)
    : ({ ok: true, value: {} } as const);
  if (!tickets.ok) {
    return NextResponse.json({ error: 'invalid_tickets', errors: tickets.errors }, { status: 400 });
  }

  const start = bannerStart ?? null;
  const end = bannerEnd ?? null;

  if (await announcementRepository.hasOverlap(start, end, id)) {
    return NextResponse.json({ error: 'overlap' }, { status: 409 });
  }

  const updated = await announcementRepository.update(id, {
    ...(title != null && { title: (title as string).trim() }),
    ...(description != null && { description: (description as string).trim() }),
    bannerStart: start,
    bannerEnd: end,
    salesStart: salesStart ?? null,
    salesEnd: salesEnd ?? null,
    ...tickets.value,
  });

  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();
  const { id } = await params;
  const ok = await announcementRepository.delete(id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
