import { Employee } from '../entities/employee.entity';

export interface IEmployeeRepository {
  findByCardNumber(cardNumber: string): Promise<Employee | null>;
  searchByEmployeeNumber(query: string): Promise<Employee[]>;
  save(employee: Employee): Promise<Employee>;
  updateTab(cardNumber: string, tab: number): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  delete(cardNumber: string): Promise<boolean>;
  updateEmployeeNumber(cardNumber: string, newEmployeeNumber: string): Promise<Employee | null>;
}
