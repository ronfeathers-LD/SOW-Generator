import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the original SOW
    const originalSOW = await prisma.sOW.findUnique({
      where: { id: params.id }
    });

    if (!originalSOW) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Get all versions of this SOW
    const versions = await prisma.sOW.findMany({
      where: {
        OR: [
          { id: params.id },
          { parentId: params.id }
        ]
      },
      orderBy: {
        version: 'desc'
      },
      select: {
        id: true,
        version: true,
        isLatest: true,
        createdAt: true
      }
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
} 