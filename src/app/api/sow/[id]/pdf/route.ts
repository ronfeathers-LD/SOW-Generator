import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const sowUrl = `${baseUrl}/sow/${id}?pdf=1`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(sowUrl, { waitUntil: 'networkidle0' });
    // Optionally, wait for a specific selector to ensure content is loaded
    // await page.waitForSelector('#sow-content-to-export');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });
    await browser.close();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SOW_${id}.pdf"`,
      },
    });
  } catch (err) {
    if (browser) await browser.close();
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
} 