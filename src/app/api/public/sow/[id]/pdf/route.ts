import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const sowUrl = `${baseUrl}/public/sow/${id}`;

  // Verify the SOW exists
  const { data: sow, error } = await supabase
    .from('sows')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !sow) {
    return new NextResponse('SOW not found', { status: 404 });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(sowUrl, { waitUntil: 'networkidle0' });
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
    console.error('PDF generation error:', err);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
} 