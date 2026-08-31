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

/**
 * Just the customer signature block. The billing details section later in the
 * document legitimately repeats the address, so whole-document assertions
 * cannot tell "the signer fell back to the company" from "the billing section
 * printed the address".
 */
function customerBlock(sowData: Record<string, unknown>): string {
  const html = titlePageHtml(sowData);
  const start = html.indexOf('This SOW is accepted by');
  const end = html.indexOf('This SOW is accepted by LeanData');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

/**
 * The real data shape: the Billing Information tab writes to the `billing_info`
 * JSONB column, NOT the flat billing_* columns. Testing with the flat fields
 * passed my first attempt while production printed a company name with no
 * address, because it fell through to client_name.
 */
const BASE = {
  id: 'test',
  sow_title: 'Test SOW',
  client_name: 'Hula Truck',
  billing_info: {
    company_name: 'Hula Truck',
    billing_address: '1 Billing Lane, San Jose, CA, 94070, United States',
  },
  leandata_name: 'Dave Ginsburg',
  leandata_title: 'Chief Customer Officer',
  leandata_email: 'dave.ginsburg@leandata.com',
};

describe('PDF customer signature block', () => {
  it('never prints the old literal placeholders', () => {
    const block = customerBlock({ ...BASE, client_signer_name: '', client_title: '', client_email: '' });
    expect(block).not.toContain('Client Representative');
    expect(block).not.toContain('<strong></strong>');
  });

  it('falls back to the company name and formatted address', () => {
    const block = customerBlock({ ...BASE, client_signer_name: '', client_title: '', client_email: '' });
    expect(block).toContain('<strong>Hula Truck</strong>');
    expect(block).toContain('1 Billing Lane');
    expect(block).toContain('San Jose, CA 94070');
    expect(block).toContain('United States');
  });

  it('prints a named signer and not the company fallback', () => {
    const block = customerBlock({
      ...BASE,
      client_signer_name: 'Dana Reyes',
      client_title: 'VP RevOps',
      client_email: 'dana@hula.com',
    });
    expect(block).toContain('<strong>Dana Reyes</strong>');
    expect(block).toContain('VP RevOps');
    expect(block).toContain('dana@hula.com');
    expect(block).not.toContain('1 Billing Lane');
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
    expect(titlePageHtml(BASE)).toContain('San Jose, CA 94070');
  });

  it('still works when only the flat billing_* columns are set', () => {
    const html = customerBlock({
      id: 'test',
      client_name: 'Hula Truck',
      billing_company_name: 'Hula Truck',
      billing_address: '1 Billing Lane, San Jose, CA, 94070',
      client_signer_name: '',
      client_title: '',
      client_email: '',
    });
    expect(html).toContain('<strong>Hula Truck</strong>');
    expect(html).toContain('San Jose, CA 94070');
  });

  it('falls back to the client name when no billing company is on file', () => {
    const html = customerBlock({
      id: 'test',
      client_name: 'Hula Truck',
      client_signer_name: '',
      client_title: '',
      client_email: '',
    });
    expect(html).toContain('<strong>Hula Truck</strong>');
  });
});
