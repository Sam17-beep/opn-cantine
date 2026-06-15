import { ObjectId } from 'mongodb';
import { Special } from '@/lib/domain/entities/special.entity';
import { ISpecialRepository } from '@/lib/domain/ports/special.repository.port';
import { getDb } from '../db/mongo';

type DocShape = Omit<Special, 'id'> & { _id: ObjectId };

function toEntity(doc: DocShape): Special {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() };
}

class MongoSpecialRepository implements ISpecialRepository {
  private readonly col = 'specials';

  private async collection() {
    const db = await getDb();
    return db.collection<DocShape>(this.col);
  }

  async getAll(): Promise<Special[]> {
    const col = await this.collection();
    const docs = await col.find({}).sort({ start: -1, createdAt: -1 }).toArray();
    return docs.map(toEntity);
  }

  async getActive(date: string): Promise<Special[]> {
    const col = await this.collection();
    const docs = await col.find({
      start: { $ne: null, $lte: date },
      $or: [{ end: null }, { end: { $gte: date } }],
    } as never).toArray();
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<Special | null> {
    const col = await this.collection();
    const doc = await col.findOne({ _id: new ObjectId(id) } as never);
    return doc ? toEntity(doc) : null;
  }

  async create(data: Omit<Special, 'id' | 'createdAt' | 'updatedAt'>): Promise<Special> {
    const col = await this.collection();
    const now = new Date();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const result = await col.insertOne(payload as never);
    return { ...payload, id: result.insertedId.toHexString() };
  }

  async update(id: string, data: Partial<Omit<Special, 'id' | 'createdAt'>>): Promise<Special | null> {
    const col = await this.collection();
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) } as never,
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? toEntity(result as unknown as DocShape) : null;
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.collection();
    const result = await col.deleteOne({ _id: new ObjectId(id) } as never);
    return result.deletedCount > 0;
  }
}

export const specialRepository = new MongoSpecialRepository();
