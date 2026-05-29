import { NextRequest, NextResponse } from 'next/server';
import { EmployeeApplicationService } from '@/lib/application/services/employee.application.service';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';

const service = new EmployeeApplicationService(employeeRepository);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { employeeNumber, initialTab } = body;

  if (!employeeNumber) {
    return NextResponse.json(
      { error: 'employeeNumber is required' },
      { status: 400 }
    );
  }

  const parsedInitialTab =
    typeof initialTab === 'number' && isFinite(initialTab) && initialTab >= 0
      ? initialTab
      : 0;

  try {
    const employee = await service.create(employeeNumber, parsedInitialTab);
    return NextResponse.json(employee, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
