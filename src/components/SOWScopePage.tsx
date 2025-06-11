import React, { memo } from 'react';

interface SOWScopePageProps {
  deliverables: string[];
}

const SOWScopePage: React.FC<SOWScopePageProps> = memo(({ deliverables }) => {
  return (
    <div className="max-w-3xl mx-auto my-12 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6">SCOPE</h2>
      <p className="mb-4">
        The customer has implemented LeanData and seeks to augment their team with LeanData expertise through Expert Services provided by the LeanData Professional Services team. As part of Expert Services, LeanData personnel as requested in the table below will assist the customer with one or more of the following:
      </p>
      <article className="prose prose-indigo max-w-none mb-4">
        {deliverables.map((deliverable, index) => (
          <div key={index} dangerouslySetInnerHTML={{ __html: deliverable }} />
        ))}
      </article>
      <p>
        Customer is designated to have the primary responsibility for activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team.
      </p>
    </div>
  );
});

SOWScopePage.displayName = 'SOWScopePage';

export default SOWScopePage; 