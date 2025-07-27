import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (session.user?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { session };
}

// GET - Retrieve Salesforce configuration
export async function GET() {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const config = await prisma.salesforceConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (!config) {
      return NextResponse.json({ error: 'No Salesforce configuration found' }, { status: 404 });
    }

    // Don't return the password in the response
    const { password, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error retrieving Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Salesforce configuration' },
      { status: 500 }
    );
  }
}

// POST - Create new Salesforce configuration
export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { username, password, securityToken, loginUrl, isActive } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Deactivate any existing configurations
    await prisma.salesforceConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new configuration
    const config = await prisma.salesforceConfig.create({
      data: {
        username,
        password,
        securityToken: securityToken || null,
        loginUrl: loginUrl || 'https://login.salesforce.com',
        isActive: isActive !== false, // Default to true
      }
    });

    // Don't return the password in the response
    const { password: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig }, { status: 201 });
  } catch (error) {
    console.error('Error creating Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to create Salesforce configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update existing Salesforce configuration
export async function PUT(request: NextRequest) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { id, username, password, securityToken, loginUrl, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Deactivate other configurations if this one is being activated
    if (isActive !== false) {
      await prisma.salesforceConfig.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    // Update the configuration
    const config = await prisma.salesforceConfig.update({
      where: { id },
      data: {
        username,
        password,
        securityToken: securityToken || null,
        loginUrl: loginUrl || 'https://login.salesforce.com',
        isActive: isActive !== false,
        updatedAt: new Date(),
      }
    });

    // Don't return the password in the response
    const { password: _, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Error updating Salesforce config:', error);
    return NextResponse.json(
      { error: 'Failed to update Salesforce configuration' },
      { status: 500 }
    );
  }
} 