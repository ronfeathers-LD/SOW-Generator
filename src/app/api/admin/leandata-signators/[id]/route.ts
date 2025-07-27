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

// PUT - Update a LeanData signator
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { name, email, title, isActive } = body;

    if (!name || !email || !title) {
      return NextResponse.json(
        { error: 'Name, email, and title are required' },
        { status: 400 }
      );
    }

    // Check if email already exists for a different signator
    const existingSignator = await prisma.leanDataSignator.findFirst({
      where: {
        email,
        id: { not: (await params).id }
      }
    });

    if (existingSignator) {
      return NextResponse.json(
        { error: 'A signator with this email already exists' },
        { status: 400 }
      );
    }

    const signator = await prisma.leanDataSignator.update({
      where: { id: (await params).id },
      data: {
        name,
        email,
        title,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(signator);
  } catch (error) {
    console.error('Error updating LeanData signator:', error);
    return NextResponse.json(
      { error: 'Failed to update LeanData signator' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a LeanData signator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdminAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    await prisma.leanDataSignator.delete({
      where: { id: (await params).id }
    });

    return NextResponse.json({ message: 'LeanData signator deleted successfully' });
  } catch (error) {
    console.error('Error deleting LeanData signator:', error);
    return NextResponse.json(
      { error: 'Failed to delete LeanData signator' },
      { status: 500 }
    );
  }
} 