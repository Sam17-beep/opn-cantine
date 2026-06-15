import { NextRequest, NextResponse } from 'next/server';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();
  const events = await announcementRepository.getAll();
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const body = await request.json();
  const { title, description, bannerStart, bannerEnd, salesStart, salesEnd, product } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
  }

  const start = bannerStart || null;
  const end = bannerEnd || null;

  if (await announcementRepository.hasOverlap(start, end)) {
    return NextResponse.json({ error: 'overlap' }, { status: 409 });
  }

  const created = await announcementRepository.create({
    title: title.trim(),
    description: description.trim(),
    bannerStart: start,
    bannerEnd: end,
    salesStart: salesStart || null,
    salesEnd: salesEnd || null,
    product: product?.name && product?.price != null
      ? { name: product.name.trim(), price: parseFloat(product.price) }
      : null,
  });

  return NextResponse.json(created, { status: 201 });
}
