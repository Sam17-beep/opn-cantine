import { ObjectId } from 'mongodb';
import { Announcement } from '@/lib/domain/entities/announcement.entity';
import { IAnnouncementRepository } from '@/lib/domain/ports/announcement.repository.port';
import { getDb } from '../db/mongo';

type DocShape = Omit<Announcement, 'id'> & { _id: ObjectId };

function toEntity(doc: DocShape): Announcement {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() };
}

function utcDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export class MongoAnnouncementRepository implements IAnnouncementRepository {
  private readonly col = 'announcements';

  private async collection() {
    const db = await getDb();
    return db.collection<DocShape>(this.col);
  }

  async getAll(): Promise<Announcement[]> {
    const col = await this.collection();
    const docs = await col.find({ _id: { $type: 'objectId' } } as never).sort({ bannerStart: -1, createdAt: -1 }).toArray();
    return docs.map(toEntity);
  }

  // Returns the event whose banner period contains today (UTC). Client re-checks with local date.
  async getCurrent(): Promise<Announcement | null> {
    const col = await this.collection();
    const today = utcDateString();
    const doc = await col.findOne({
      bannerStart: { $lte: today },
      $or: [{ bannerEnd: null }, { bannerEnd: { $gte: today } }],
      _id: { $type: 'objectId' },
    } as never);
    return doc ? toEntity(doc) : null;
  }

  async findById(id: string): Promise<Announcement | null> {
    const col = await this.collection();
    const doc = await col.findOne({ _id: new ObjectId(id) } as never);
    return doc ? toEntity(doc) : null;
  }

  async create(data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> {
    const col = await this.collection();
    const now = new Date();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const result = await col.insertOne(payload as never);
    return { ...payload, id: result.insertedId.toHexString() };
  }

  async update(id: string, data: Partial<Omit<Announcement, 'id' | 'createdAt'>>): Promise<Announcement | null> {
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

  // Drafts (no bannerStart) never overlap with anything.
  async hasOverlap(bannerStart: string | null, bannerEnd: string | null, excludeId?: string): Promise<boolean> {
    if (!bannerStart) return false;
    const all = await this.getAll();
    return all.some(event => {
      if (excludeId && event.id === excludeId) return false;
      if (!event.bannerStart) return false;
      const e1 = bannerEnd ?? '9999-12-31';
      const e2 = event.bannerEnd ?? '9999-12-31';
      return bannerStart <= e2 && event.bannerStart <= e1;
    });
  }
}

export const announcementRepository = new MongoAnnouncementRepository();
