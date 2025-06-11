import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { status, version } = await request.json();

    // Validate status
    const validStatuses = ['draft', 'in_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return new NextResponse('Invalid status', { status: 400 });
    }

    // Get the current SOW
    const currentSOW = await prisma.sOW.findUnique({
      where: { id: params.id },
    });

    if (!currentSOW) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    // Verify version matches
    if (currentSOW.version !== version) {
      return new NextResponse('Version mismatch', { status: 400 });
    }

    // Update SOW status
    const updatedSOW = await prisma.sOW.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(updatedSOW);
  } catch (error) {
    console.error('Error updating SOW status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 