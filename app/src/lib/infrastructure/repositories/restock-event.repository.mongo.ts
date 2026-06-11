import { RestockEvent } from '@/lib/domain/entities/restock-event.entity';
import { IRestockEventRepository } from '@/lib/domain/ports/restock-event.repository.port';
import { getDb } from '../db/mongo';

export class MongoRestockEventRepository implements IRestockEventRepository {
  private readonly collectionName = 'restock_events';

  private async collection() {
    const db = await getDb();
    return db.collection<RestockEvent>(this.collectionName);
  }

  async save(event: RestockEvent): Promise<RestockEvent> {
    const col = await this.collection();
    const result = await col.insertOne({ ...event });
    return { ...event, id: result.insertedId.toString() };
  }

  async findAll(): Promise<RestockEvent[]> {
    const col = await this.collection();
    return col.find().sort({ timestamp: -1 }).toArray();
  }
}

export const restockEventRepository = new MongoRestockEventRepository();
