import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sow = await prisma.sOW.findUnique({
      where: {
        id: params.id
      }
    });

    if (!sow) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sow);
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOW' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let data;
  try {
    data = await request.json();
    // Find the SOW to ensure it exists
    const existingSOW = await prisma.sOW.findUnique({
      where: { id: params.id },
    });

    if (!existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Update the SOW
    const updatedSOW = await prisma.sOW.update({
      where: { id: params.id },
      data: {
        companyLogo: data.header.companyLogo,
        clientName: data.header.clientName,
        sowTitle: data.header.sowTitle,
        effectiveDate: new Date(data.header.effectiveDate),
        clientTitle: data.clientSignature.title,
        clientEmail: data.clientSignature.email,
        signatureDate: new Date(data.clientSignature.signatureDate),
        clientSignerName: data.clientSignerName || '',
        projectDescription: data.scope.projectDescription,
        deliverables: data.scope.deliverables,
        startDate: new Date(data.scope.timeline.startDate),
        duration: data.scope.timeline.duration,
        clientRoles: data.roles.clientRoles,
        pricingRoles: data.pricing.roles,
        billingInfo: data.pricing.billing,
        accessRequirements: data.assumptions.accessRequirements,
        travelRequirements: data.assumptions.travelRequirements,
        workingHours: data.assumptions.workingHours,
        testingResponsibilities: data.assumptions.testingResponsibilities,
        addendums: data.addendums,
      },
    });

    return NextResponse.json(updatedSOW);
  } catch (error) {
    console.error('Error updating SOW:', error, { body: data });
    return NextResponse.json(
      { error: 'Failed to update SOW' },
      { status: 500 }
    );
  }
} 