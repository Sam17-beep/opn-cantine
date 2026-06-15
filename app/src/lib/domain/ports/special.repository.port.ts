import { Special } from '../entities/special.entity';

export interface ISpecialRepository {
  getAll(): Promise<Special[]>;
  getActive(date: string): Promise<Special[]>;
  findById(id: string): Promise<Special | null>;
  create(data: Omit<Special, 'id' | 'createdAt' | 'updatedAt'>): Promise<Special>;
  update(id: string, data: Partial<Omit<Special, 'id' | 'createdAt'>>): Promise<Special | null>;
  delete(id: string): Promise<boolean>;
}
