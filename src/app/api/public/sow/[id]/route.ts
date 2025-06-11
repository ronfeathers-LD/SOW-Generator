import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sow = await prisma.sOW.findUnique({
      where: { id: params.id },
    });

    if (!sow) {
      return new NextResponse('SOW not found', { status: 404 });
    }

    return NextResponse.json(sow);
  } catch (error) {
    console.error('Error fetching SOW:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 