import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sow = await prisma.sOW.findUnique({
      where: {
        id: (await params).id
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
  { params }: { params: Promise<{ id: string }> }
) {
  let data;
  try {
    data = await request.json();
    
    // Debug logging
    console.log('API received data:', {
      clientName: data.header?.clientName,
      clientSignerName: data.clientSignerName,
      clientSignature: data.clientSignature,
      template: data.template
    });
    
    // Find the SOW to ensure it exists
    const existingSOW = await prisma.sOW.findUnique({
      where: { id: (await params).id },
    });

    if (!existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Build update data object with safe field access
    const updateData: any = {};
    
    // Header fields
    if (data.header) {
      if (data.header.companyLogo !== undefined) updateData.companyLogo = data.header.companyLogo;
      if (data.header.clientName !== undefined) updateData.clientName = data.header.clientName;
      if (data.header.sowTitle !== undefined) updateData.sowTitle = data.header.sowTitle;
    }
    
    // Client signature fields
    if (data.clientSignature) {
      if (data.clientSignature.title !== undefined) updateData.clientTitle = data.clientSignature.title;
      if (data.clientSignature.email !== undefined) updateData.clientEmail = data.clientSignature.email;
      if (data.clientSignature.signatureDate !== undefined) updateData.signatureDate = new Date(data.clientSignature.signatureDate);
    }
    
    if (data.clientSignerName !== undefined) updateData.clientSignerName = data.clientSignerName || '';
    
    // Scope fields
    if (data.scope) {
      if (data.scope.projectDescription !== undefined) updateData.projectDescription = data.scope.projectDescription;
      if (data.scope.deliverables !== undefined) updateData.deliverables = data.scope.deliverables;
      if (data.scope.timeline?.startDate !== undefined) updateData.startDate = new Date(data.scope.timeline.startDate);
      if (data.scope.timeline?.duration !== undefined) updateData.duration = data.scope.timeline.duration;
    }
    
    // Roles fields
    if (data.roles?.clientRoles !== undefined) updateData.clientRoles = data.roles.clientRoles;
    if (data.pricing?.roles !== undefined) updateData.pricingRoles = data.pricing.roles;
    if (data.pricing?.billing !== undefined) updateData.billingInfo = data.pricing.billing;
    
    // Assumptions fields
    if (data.assumptions) {
      if (data.assumptions.accessRequirements !== undefined) updateData.accessRequirements = data.assumptions.accessRequirements;
      if (data.assumptions.travelRequirements !== undefined) updateData.travelRequirements = data.assumptions.travelRequirements;
      if (data.assumptions.workingHours !== undefined) updateData.workingHours = data.assumptions.workingHours;
      if (data.assumptions.testingResponsibilities !== undefined) updateData.testingResponsibilities = data.assumptions.testingResponsibilities;
    }
    
    if (data.addendums !== undefined) updateData.addendums = data.addendums;
    
    // Salesforce Opportunity Information
    if (data.template) {
      if (data.template.opportunityId !== undefined) updateData.opportunityId = data.template.opportunityId || null;
      if (data.template.opportunityName !== undefined) updateData.opportunityName = data.template.opportunityName || null;
      if (data.template.opportunityAmount !== undefined) updateData.opportunityAmount = data.template.opportunityAmount || null;
      if (data.template.opportunityStage !== undefined) updateData.opportunityStage = data.template.opportunityStage || null;
      if (data.template.opportunityCloseDate !== undefined) updateData.opportunityCloseDate = data.template.opportunityCloseDate ? new Date(data.template.opportunityCloseDate) : null;
    }

    // Update the SOW
    const updatedSOW = await prisma.sOW.update({
      where: { id: (await params).id },
      data: updateData,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find the SOW to ensure it exists
    const existingSOW = await prisma.sOW.findUnique({
      where: { id },
      include: {
        versions: true,
        comments: true,
      },
    });

    if (!existingSOW) {
      return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
    }

    // Delete all comments first (they reference the SOW)
    if (existingSOW.comments.length > 0) {
      await prisma.comment.deleteMany({
        where: { sowId: id },
      });
    }

    // Delete all versions of this SOW
    if (existingSOW.versions.length > 0) {
      await prisma.sOW.deleteMany({
        where: { parentId: id },
      });
    }

    // Finally delete the main SOW
    await prisma.sOW.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'SOW deleted successfully' });
  } catch (error) {
    console.error('Error deleting SOW:', error);
    return NextResponse.json(
      { error: 'Failed to delete SOW' },
      { status: 500 }
    );
  }
} 