import { RestockEvent } from '../entities/restock-event.entity';

export interface IRestockEventRepository {
  save(event: RestockEvent): Promise<RestockEvent>;
  findAll(): Promise<RestockEvent[]>;
}
