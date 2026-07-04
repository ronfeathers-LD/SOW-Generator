import { describe, expect, it } from 'vitest';
import { getSectionStatus } from './section-status';
import type { SOWData } from '@/types/sow';

function projectOverviewFormData(overrides: {
  products?: string[];
  timeline_weeks?: string;
  salesforce_tenants?: string;
}): Partial<SOWData> {
  return {
    template: {
      products: overrides.products ?? ['product-1'],
      timeline_weeks: overrides.timeline_weeks ?? '3',
      salesforce_tenants: overrides.salesforce_tenants ?? '1',
    },
  } as Partial<SOWData>;
}

describe('getSectionStatus — Project Overview isUnset handling', () => {
  it('treats empty-string salesforce_tenants/timeline_weeks as unset (incomplete)', () => {
    const formData = projectOverviewFormData({ timeline_weeks: '', salesforce_tenants: '' });
    expect(getSectionStatus('Project Overview', formData)).toBe('attention');
  });

  it('treats the legacy "999" sentinel as unset (incomplete), same as empty string', () => {
    const formData = projectOverviewFormData({ timeline_weeks: '999', salesforce_tenants: '999' });
    expect(getSectionStatus('Project Overview', formData)).toBe('attention');
  });

  it('treats real values as set, yielding complete when products are also present', () => {
    const formData = projectOverviewFormData({ timeline_weeks: '12', salesforce_tenants: '3' });
    expect(getSectionStatus('Project Overview', formData)).toBe('complete');
  });

  it('is empty when nothing is filled in at all', () => {
    const formData = projectOverviewFormData({ products: [], timeline_weeks: '', salesforce_tenants: '' });
    expect(getSectionStatus('Project Overview', formData)).toBe('empty');
  });
});
