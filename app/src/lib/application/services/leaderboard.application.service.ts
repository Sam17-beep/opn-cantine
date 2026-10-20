import { ITransactionRepository } from '@/lib/domain/ports/transaction.repository.port';
import { IEmployeeRepository } from '@/lib/domain/ports/employee.repository.port';
import { CASH_CARD_NUMBER } from '@/lib/domain/constants';
import {
  LeaderboardStanding,
  computeStanding,
  startOfYearInZone,
} from '@/lib/domain/leaderboard';

export class LeaderboardApplicationService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly employeeRepository: IEmployeeRepository
  ) {}

  /** Year-to-date spending rank of `cardNumber`, or null when it has none. */
  async getStanding(cardNumber: string, now: Date = new Date()): Promise<LeaderboardStanding | null> {
    const [totals, employees] = await Promise.all([
      this.transactionRepository.sumSpendingByCard(startOfYearInZone(now), [CASH_CARD_NUMBER]),
      this.employeeRepository.findAll(),
    ]);

    // Sales of deleted employees stay in the ledger but no longer compete.
    const registered = new Set(employees.map((e) => e.cardNumber));
    return computeStanding(
      totals.filter((t) => registered.has(t.cardNumber)),
      cardNumber
    );
  }
}
