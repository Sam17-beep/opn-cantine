import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardApplicationService } from '@/lib/application/services/leaderboard.application.service';
import { transactionRepository } from '@/lib/infrastructure/repositories/transaction.repository.mongo';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';

const service = new LeaderboardApplicationService(transactionRepository, employeeRepository);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cardNumber: string }> }
) {
  try {
    const { cardNumber } = await params;

    if (!cardNumber) {
      return NextResponse.json({ error: 'Card number required' }, { status: 400 });
    }

    // Only the caller's own standing: other employees are never identified.
    const standing = await service.getStanding(cardNumber);
    return NextResponse.json({ standing });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
