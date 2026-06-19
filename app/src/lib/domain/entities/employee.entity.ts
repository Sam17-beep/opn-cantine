export interface Employee {
  cardNumber: string;
  employeeNumber: string;
  tab: number;
}

export class EmployeeEntity implements Employee {
  constructor(
    public readonly cardNumber: string,
    public readonly employeeNumber: string,
    public tab: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.cardNumber || this.cardNumber.trim().length === 0) {
      throw new Error('Card number is required');
    }

    if (!this.employeeNumber || this.employeeNumber.trim().length === 0) {
      throw new Error('Employee number is required');
    }
  }

  static create(cardNumber: string, employeeNumber: string, initialTab: number = 0): EmployeeEntity {
    return new EmployeeEntity(cardNumber.trim(), employeeNumber.trim(), initialTab);
  }
}
