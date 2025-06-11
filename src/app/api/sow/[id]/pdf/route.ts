import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  // Verify the SOW exists
  const sow = await prisma.sOW.findUnique({
    where: { id },
  });

  if (!sow) {
    return new NextResponse('SOW not found', { status: 404 });
  }

  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add content to the PDF
    doc.setFontSize(16);
    doc.text('Statement of Work', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Client: ${sow.clientName}`, 20, 40);
    doc.text(`Title: ${sow.sowTitle}`, 20, 50);
    doc.text(`Effective Date: ${sow.effectiveDate.toLocaleDateString()}`, 20, 60);
    
    // Add project description
    doc.setFontSize(14);
    doc.text('Project Description', 20, 80);
    doc.setFontSize(12);
    const splitDescription = doc.splitTextToSize(sow.projectDescription, 170);
    doc.text(splitDescription, 20, 90);

    // Add deliverables
    doc.setFontSize(14);
    doc.text('Deliverables', 20, 120);
    doc.setFontSize(12);
    const deliverables = typeof sow.deliverables === 'string' 
      ? sow.deliverables.split('\n').filter(Boolean)
      : [];
    deliverables.forEach((deliverable, index) => {
      const y = 130 + (index * 10);
      if (y < 280) { // Check if we need a new page
        doc.text(`• ${deliverable}`, 25, y);
      } else {
        doc.addPage();
        doc.text(`• ${deliverable}`, 25, 20);
      }
    });

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SOW_${id}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
} 