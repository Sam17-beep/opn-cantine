import { NextResponse } from 'next/server';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';

export async function GET() {
  const event = await announcementRepository.getCurrent();
  return NextResponse.json(event ?? null);
}
