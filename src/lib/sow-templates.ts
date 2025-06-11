export const SOW_TEMPLATES = {
  introduction: `This Statement of Work ("SOW") is entered into between {clientName} ("Customer") and LeanData, Inc. ("LeanData") pursuant to the Master Services Agreement between Customer and LeanData (the "Agreement"). This SOW is subject to the terms and conditions of the Agreement. In the event of any conflict between the terms of this SOW and the Agreement, the terms of this SOW shall prevail.`,

  scope: `The Customer will implement LeanData. The Customer will be responsible for the following:`,
  
  roles: {
    intro: `The following roles will be provided by LeanData:`,
    roles: [
      {
        title: "Account Executive",
        responsibilities: "Primary point of contact for the Customer, responsible for overall account management and customer satisfaction."
      },
      {
        title: "Project Manager",
        responsibilities: "Manages the implementation project, coordinates resources, and ensures timely delivery of milestones."
      },
      {
        title: "Solution Engineer",
        responsibilities: "Provides technical expertise, designs solutions, and ensures successful implementation of LeanData features."
      }
    ]
  },

  pricing: `Pricing is based on time and materials. If the actual hours exceed the estimated hours, LeanData will notify the Customer in writing. Additional requests will be billed at the then-current rates.`,

  assumptions: `This SOW is based on the following assumptions:
1. Customer will provide necessary access to systems and resources
2. Additional requests may require a change order
3. Travel expenses are not included
4. Services will be delivered during standard business hours`,

  addendum: {
    cssOverride: {
      overview: `The CSS Override feature allows customization of the LeanData interface.`,
      risks: `Custom CSS may affect system performance and compatibility.`,
      mitigation: `All changes will be tested in a staging environment before deployment.`
    },
    bookItApi: {
      overview: `The BookIt API enables integration with calendar systems.`,
      risks: `API changes may require updates to existing integrations.`,
      mitigation: `API versioning will be maintained for backward compatibility.`
    }
  }
};

export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => data[key] || match);
} 