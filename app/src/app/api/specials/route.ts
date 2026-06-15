import { NextRequest, NextResponse } from 'next/server';
import { specialRepository } from '@/lib/infrastructure/repositories/special.repository.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();
  const specials = await specialRepository.getAll();
  return NextResponse.json(specials);
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const body = await request.json();
  const { name, start, end, overrides } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!Array.isArray(overrides)) {
    return NextResponse.json({ error: 'overrides must be an array' }, { status: 400 });
  }

  const created = await specialRepository.create({
    name: name.trim(),
    start: start ?? null,
    end: end ?? null,
    overrides,
  });

  return NextResponse.json(created, { status: 201 });
}
