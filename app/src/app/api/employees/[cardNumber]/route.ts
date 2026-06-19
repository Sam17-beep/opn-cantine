import { NextRequest, NextResponse } from 'next/server';
import { EmployeeApplicationService } from '@/lib/application/services/employee.application.service';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';

const service = new EmployeeApplicationService(employeeRepository);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardNumber: string }> }
) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const { cardNumber } = await params;
  const body = await request.json();
  const { employeeNumber: newEmployeeNumber } = body;

  if (!newEmployeeNumber || typeof newEmployeeNumber !== 'string' || !newEmployeeNumber.trim()) {
    return NextResponse.json({ error: 'employeeNumber is required' }, { status: 400 });
  }

  try {
    const employee = await service.updateEmployeeNumber(cardNumber, newEmployeeNumber.trim());
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    return NextResponse.json(employee);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
