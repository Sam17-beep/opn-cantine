import { NextRequest, NextResponse } from 'next/server';
import { EmployeeApplicationService } from '@/lib/application/services/employee.application.service';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';

const service = new EmployeeApplicationService(employeeRepository);

export async function GET(request: NextRequest) {
  const cardNumber = request.nextUrl.searchParams.get('cardNumber');

  if (!cardNumber) {
    return NextResponse.json(
      { error: 'cardNumber is required' },
      { status: 400 }
    );
  }

  const employee = await service.lookup(cardNumber);

  if (!employee) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, employee });
}
