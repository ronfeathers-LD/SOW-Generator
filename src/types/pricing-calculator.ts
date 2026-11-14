/** Shared shapes for the standalone pricing calculator (page, form, results). */

export interface CalculatorProduct {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CalculatorData {
  products: string[];
  number_of_units: string;
  orchestration_units: string;
  bookit_forms_units: string;
  bookit_links_units: string;
  bookit_handoff_units: string;
  account_segment?: string;
  pm_hours_removed?: boolean;
  discount_type?: 'none' | 'fixed' | 'percentage';
  discount_amount?: number;
  discount_percentage?: number;
  hourly_rates?: {
    onboardingSpecialist?: number;
    projectManager?: number;
  };
}
