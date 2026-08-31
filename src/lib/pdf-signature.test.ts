// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PDFGenerator } from './pdf-generator';

/**
 * The PDF builds its own HTML string, entirely separate from SOWTitlePage.
 * It printed the literal placeholders "Client Representative / Title / Email"
 * for months after the React side learned to fall back to the company.
 * These assertions run against the real template.
 */
function titlePageHtml(sowData: Record<string, unknown>): string {
  const generator = new PDFGenerator() as unknown as {
    generateSOWHTML: (d: Record<string, unknown>, p?: string[]) => string;
  };
  return generator.generateSOWHTML(sowData, []);
}

const BASE = {
  id: 'test',
  sow_title: 'Test SOW',
  client_name: 'Hula Truck',
  billing_company_name: 'Hula Truck',
  billing_address: '1 Billing Lane, San Jose, CA, 94070, United States',
  leandata_name: 'Dave Ginsburg',
  leandata_title: 'Chief Customer Officer',
  leandata_email: 'dave.ginsburg@leandata.com',
};

describe('PDF customer signature block', () => {
  it('never prints the old literal placeholders', () => {
    const html = titlePageHtml({ ...BASE, client_signer_name: '', client_title: '', client_email: '' });
    expect(html).not.toContain('Client Representative');
    expect(html).not.toContain('<strong></strong>');
  });

  it('falls back to the company name and formatted address', () => {
    const html = titlePageHtml({ ...BASE, client_signer_name: '', client_title: '', client_email: '' });
    expect(html).toContain('<strong>Hula Truck</strong>');
    expect(html).toContain('1 Billing Lane');
    expect(html).toContain('San Jose, CA 94070');
    expect(html).toContain('United States');
  });

  it('prints a named signer and not the company fallback', () => {
    const html = titlePageHtml({
      ...BASE,
      client_signer_name: 'Dana Reyes',
      client_title: 'VP RevOps',
      client_email: 'dana@hula.com',
    });
    expect(html).toContain('<strong>Dana Reyes</strong>');
    expect(html).toContain('VP RevOps');
    expect(html).toContain('dana@hula.com');
    expect(html).not.toContain('1 Billing Lane');
  });

  it('escapes values interpolated into the HTML string', () => {
    const html = titlePageHtml({
      ...BASE,
      client_signer_name: '<script>alert(1)</script>',
      client_title: '',
      client_email: '',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('formats the billing address section conventionally too', () => {
    const html = titlePageHtml({
      ...BASE,
      billing_info: { billing_address: '1 Billing Lane, San Jose, CA, 94070, United States' },
    });
    expect(html).toContain('San Jose, CA 94070');
  });
});
