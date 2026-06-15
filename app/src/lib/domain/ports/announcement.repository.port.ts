import { Announcement } from '../entities/announcement.entity';

export interface IAnnouncementRepository {
  getAll(): Promise<Announcement[]>;
  getCurrent(): Promise<Announcement | null>;
  findById(id: string): Promise<Announcement | null>;
  create(data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement>;
  update(id: string, data: Partial<Omit<Announcement, 'id' | 'createdAt'>>): Promise<Announcement | null>;
  delete(id: string): Promise<boolean>;
  hasOverlap(bannerStart: string | null, bannerEnd: string | null, excludeId?: string): Promise<boolean>;
}
