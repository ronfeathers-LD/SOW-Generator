import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.avomaConfig.findFirst();
    
    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Don't return the actual API key in the response
    const { apiKey, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error fetching Avoma config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, apiUrl, isActive, customerId } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Check if config already exists
    const existingConfig = await prisma.avomaConfig.findFirst();
    
    if (existingConfig) {
      return NextResponse.json({ error: 'Configuration already exists. Use PUT to update.' }, { status: 400 });
    }

    const config = await prisma.avomaConfig.create({
      data: {
        apiKey,
        apiUrl: apiUrl || 'https://api.avoma.com',
        isActive: isActive !== undefined ? isActive : true,
        customerId: customerId || null,
      },
    });

    // Don't return the actual API key in the response
    const { apiKey: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error creating Avoma config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, apiKey, apiUrl, isActive, customerId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (customerId !== undefined) updateData.customerId = customerId;

    const config = await prisma.avomaConfig.update({
      where: { id },
      data: updateData,
    });

    // Don't return the actual API key in the response
    const { apiKey: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error updating Avoma config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 