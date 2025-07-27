import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the original SOW
    const originalSOW = await prisma.sOW.findUnique({
      where: { id: (await params).id }
    });

    if (!originalSOW) {
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Get the latest version number
    const latestVersion = await prisma.sOW.findFirst({
      where: {
        OR: [
          { id: (await params).id },
          { parentId: (await params).id }
        ]
      },
      orderBy: {
        version: 'desc'
      }
    });

    // Create a new version
    const newVersion = await prisma.sOW.create({
      data: {
        ...originalSOW,
        id: undefined, // Let Prisma generate a new ID
        version: (latestVersion?.version || 0) + 1,
        isLatest: true,
        parentId: originalSOW.parentId || originalSOW.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientRoles: originalSOW.clientRoles ?? [],
        pricingRoles: originalSOW.pricingRoles ?? [],
        billingInfo: originalSOW.billingInfo ?? {},
        addendums: originalSOW.addendums ?? [],
      }
    });

    // Update all other versions to not be latest
    await prisma.sOW.updateMany({
      where: {
        OR: [
          { id: (await params).id },
          { parentId: (await params).id }
        ],
        id: {
          not: newVersion.id
        }
      },
      data: {
        isLatest: false
      }
    });

    return NextResponse.json(newVersion);
  } catch (error) {
    console.error('Error creating new version:', error);
    return NextResponse.json(
      { error: 'Failed to create new version' },
      { status: 500 }
    );
  }
} 