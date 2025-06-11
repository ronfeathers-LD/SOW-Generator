import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Log the incoming data for debugging
    console.log('Received data:', data);
    
    const sow = await prisma.sOW.create({
      data: {
        companyLogo: data.header?.companyLogo || '',
        clientName: data.header?.clientName || '',
        sowTitle: data.header?.sowTitle || '',
        effectiveDate: data.header?.effectiveDate ? new Date(data.header.effectiveDate) : new Date(),
        
        clientTitle: data.clientSignature?.title || '',
        clientEmail: data.clientSignature?.email || '',
        signatureDate: data.clientSignature?.signatureDate ? new Date(data.clientSignature.signatureDate) : new Date(),
        
        projectDescription: data.scope?.projectDescription || '',
        deliverables: data.scope?.deliverables || '',
        startDate: data.scope?.timeline?.startDate ? new Date(data.scope.timeline.startDate) : new Date(),
        duration: data.scope?.timeline?.duration || '',
        
        clientRoles: data.roles?.clientRoles || [],
        pricingRoles: data.pricing?.roles || [],
        billingInfo: data.pricing?.billing || {},
        
        accessRequirements: data.assumptions?.accessRequirements || '',
        travelRequirements: data.assumptions?.travelRequirements || '',
        workingHours: data.assumptions?.workingHours || '',
        testingResponsibilities: data.assumptions?.testingResponsibilities || '',
        
        addendums: data.addendums || [],
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'SOW saved successfully',
      data: sow 
    });
  } catch (error) {
    console.error('Error saving SOW:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save SOW',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sows = await prisma.sOW.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(sows);
  } catch (error) {
    console.error('Error fetching SOWs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOWs' },
      { status: 500 }
    );
  }
} 