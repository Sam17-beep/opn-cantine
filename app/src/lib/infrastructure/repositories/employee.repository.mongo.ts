import { Employee } from '@/lib/domain/entities/employee.entity';
import { IEmployeeRepository } from '@/lib/domain/ports/employee.repository.port';
import { getDb } from '../db/mongo';

export class MongoEmployeeRepository implements IEmployeeRepository {
  private readonly collectionName = 'employees';

  private async collection() {
    const db = await getDb();
    return db.collection<Employee>(this.collectionName);
  }

  async findByCardNumber(cardNumber: string): Promise<Employee | null> {
    const col = await this.collection();
    return col.findOne({ cardNumber });
  }

  async searchByEmployeeNumber(query: string): Promise<Employee[]> {
    const col = await this.collection();
    return col.find({ employeeNumber: { $regex: query, $options: 'i' } }).toArray();
  }

  async save(employee: Employee): Promise<Employee> {
    const col = await this.collection();
    await col.insertOne({ ...employee });
    return employee;
  }

  async updateTab(
    cardNumber: string,
    tab: number
  ): Promise<Employee | null> {
    const col = await this.collection();
    const result = await col.findOneAndUpdate(
      { cardNumber },
      { $set: { tab } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  async findAll(): Promise<Employee[]> {
    const col = await this.collection();
    return col.find().toArray();
  }

  async delete(cardNumber: string): Promise<boolean> {
    const col = await this.collection();
    const result = await col.deleteOne({ cardNumber });
    return result.deletedCount === 1;
  }

  async updateEmployeeNumber(cardNumber: string, newEmployeeNumber: string): Promise<Employee | null> {
    const col = await this.collection();
    const conflict = await col.findOne({ employeeNumber: newEmployeeNumber, cardNumber: { $ne: cardNumber } });
    if (conflict) throw new Error('Employee number already in use');
    const result = await col.findOneAndUpdate(
      { cardNumber },
      { $set: { employeeNumber: newEmployeeNumber } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }
}

export const employeeRepository = new MongoEmployeeRepository();
