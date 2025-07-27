import { NextRequest, NextResponse } from 'next/server';
import { generateObjectives } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { customerName, projectDescription, products } = await request.json();

    if (!customerName) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    const objectives = await generateObjectives({
      customerName,
      projectDescription: projectDescription || '',
      products: products || 'LeanData Implementation',
    });

    return NextResponse.json(objectives);
  } catch (error) {
    console.error('Error generating objectives:', error);
    return NextResponse.json(
      { error: 'Failed to generate objectives' },
      { status: 500 }
    );
  }
} 