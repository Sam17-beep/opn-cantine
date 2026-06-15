import { NextRequest, NextResponse } from 'next/server';
import { specialRepository } from '@/lib/infrastructure/repositories/special.repository.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  if (body.overrides !== undefined && !Array.isArray(body.overrides)) {
    return NextResponse.json({ error: 'overrides must be an array' }, { status: 400 });
  }

  const updated = await specialRepository.update(id, {
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.start !== undefined && { start: body.start ?? null }),
    ...(body.end !== undefined && { end: body.end ?? null }),
    ...(body.overrides !== undefined && { overrides: body.overrides }),
  });

  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const { id } = await params;
  const deleted = await specialRepository.delete(id);
  if (!deleted) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
