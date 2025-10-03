import { NextResponse } from 'next/server';
import { PDFGenerator } from '@/lib/pdf-generator';

export async function GET() {
  try {
    console.log('🔍 Running PDF generation diagnostics...');
    
    const pdfGenerator = new PDFGenerator();
    const diagnostics = await pdfGenerator.diagnoseEnvironment();
    
    console.log('📊 Diagnostics completed:', diagnostics);
    
    return NextResponse.json({
      success: true,
      diagnostics,
      timestamp: new Date().toISOString(),
      recommendations: generateRecommendations(diagnostics)
    });
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = [];
  
  if (!diagnostics.chromiumAvailable) {
    recommendations.push('Chromium not available - check @sparticuz/chromium installation');
  }
  
  if (!diagnostics.puppeteerAvailable) {
    recommendations.push('Puppeteer not available - check puppeteer installation');
  }
  
  if (diagnostics.memoryUsage > 512) {
    recommendations.push('High memory usage detected - consider reducing --max_old_space_size');
  }
  
  if (diagnostics.environment === 'production') {
    recommendations.push('Production environment detected - ensure serverless compatibility');
  }
  
  if (diagnostics.systemInfo.totalMemory > 1024) {
    recommendations.push('Large memory allocation detected - may cause serverless timeout');
  }
  
  return recommendations;
}
