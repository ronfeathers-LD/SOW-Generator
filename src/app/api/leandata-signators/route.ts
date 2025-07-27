import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch all active LeanData signators (public endpoint)
export async function GET() {
  try {
    const signators = await prisma.leanDataSignator.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true
      }
    });

    return NextResponse.json(signators);
  } catch (error) {
    console.error('Error fetching LeanData signators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeanData signators' },
      { status: 500 }
    );
  }
} 