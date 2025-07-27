import { NextRequest, NextResponse } from 'next/server';
import salesforceClient from '@/lib/salesforce';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { searchTerm } = await request.json();

    if (!searchTerm) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    // Get stored Salesforce configuration
    const config = await prisma.salesforceConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Salesforce integration is not configured' },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce using stored credentials
    await salesforceClient.authenticate(config.username, config.password, config.securityToken || undefined);

    // Search for accounts
    const accounts = await salesforceClient.searchAccounts(searchTerm);

    return NextResponse.json({
      success: true,
      accounts
    });

  } catch (error) {
    console.error('Error searching Salesforce accounts:', error);
    return NextResponse.json(
      { error: 'Failed to search Salesforce accounts' },
      { status: 500 }
    );
  }
} 