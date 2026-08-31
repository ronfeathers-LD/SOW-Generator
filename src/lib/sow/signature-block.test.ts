import { describe, it, expect } from 'vitest';
import { customerSignatureBlock } from './signature-block';

const COMPANY = { name: 'Hula Truck', address: '1 Billing Lane, San Jose, CA, 94070, United States' };

describe('customerSignatureBlock', () => {
  it('prints a named signer and ignores the company', () => {
    expect(
      customerSignatureBlock({
        signer: { name: 'Dana Reyes', title: 'VP RevOps', email: 'dana@hula.com' },
        company: COMPANY,
      })
    ).toEqual({
      heading: 'Dana Reyes',
      lines: ['VP RevOps', 'dana@hula.com'],
      usedCompanyFallback: false,
    });
  });

  it('omits blank title and email for a named signer', () => {
    expect(customerSignatureBlock({ signer: { name: 'Dana Reyes' }, company: COMPANY })).toEqual({
      heading: 'Dana Reyes',
      lines: [],
      usedCompanyFallback: false,
    });
  });

  it('falls back to company name and formatted address when no signer is named', () => {
    expect(customerSignatureBlock({ signer: {}, company: COMPANY })).toEqual({
      heading: 'Hula Truck',
      lines: ['1 Billing Lane', 'San Jose, CA 94070', 'United States'],
      usedCompanyFallback: true,
    });
  });

  it('treats the React-side legacy sentinels as blank', () => {
    expect(
      customerSignatureBlock({
        signer: { name: 'Not Entered', title: 'Title Not Entered', email: 'Email Not Entered' },
        company: COMPANY,
      }).heading
    ).toBe('Hula Truck');
  });

  it('treats the PDF-side legacy placeholders as blank', () => {
    expect(
      customerSignatureBlock({
        signer: { name: 'Client Representative', title: 'Title', email: 'Email' },
        company: COMPANY,
      }).heading
    ).toBe('Hula Truck');
  });

  it('uses the address alone when no company name is on file', () => {
    expect(
      customerSignatureBlock({ signer: {}, company: { address: '1 Billing Lane, San Jose, CA, 94070' } })
    ).toEqual({
      heading: '1 Billing Lane',
      lines: ['San Jose, CA 94070'],
      usedCompanyFallback: true,
    });
  });

  it('prints nothing when neither a signer nor a company is known', () => {
    expect(customerSignatureBlock({})).toEqual({
      heading: null,
      lines: [],
      usedCompanyFallback: true,
    });
  });

  it('promotes the title when only a title is on file', () => {
    expect(customerSignatureBlock({ signer: { title: 'VP RevOps' } })).toEqual({
      heading: 'VP RevOps',
      lines: [],
      usedCompanyFallback: false,
    });
  });
});
