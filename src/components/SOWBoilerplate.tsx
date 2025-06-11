import { SOW_TEMPLATES, renderTemplate } from '@/lib/sow-templates';

interface SOWBoilerplateProps {
  clientName: string;
  deliverables: string[];
}

export default function SOWBoilerplate({ clientName, deliverables }: SOWBoilerplateProps) {
  const data = {
    clientName,
  };

  const renderSection = (title: string, content: string) => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="prose max-w-none">
        {content.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4">
            {renderTemplate(paragraph, { clientName })}
          </p>
        ))}
      </div>
    </div>
  );

  const renderScope = () => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Scope</h2>
      <div className="prose max-w-none">
        <p className="mb-4">
          {renderTemplate(SOW_TEMPLATES.scope, { clientName })}
        </p>
        <ul className="list-disc pl-6 mb-4">
          {deliverables.map((deliverable, index) => (
            <li key={index} className="mb-2">
              {deliverable}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderRoles = () => {
    const data = {
      clientName
    };

    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Roles and Responsibilities</h2>
        <div className="prose max-w-none">
          <p className="mb-4">
            {renderTemplate(SOW_TEMPLATES.roles.intro, data)}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Responsibilities</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {SOW_TEMPLATES.roles.roles.map((role, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-b">
                      {role.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 border-b">
                      {role.responsibilities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAddendum = () => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Addendum</h2>
      <div className="prose max-w-none">
        <h3 className="text-lg font-medium mb-2">CSS Override</h3>
        <p className="mb-4">{SOW_TEMPLATES.addendum.cssOverride.overview}</p>
        <p className="mb-4">{SOW_TEMPLATES.addendum.cssOverride.risks}</p>
        <p className="mb-4">{SOW_TEMPLATES.addendum.cssOverride.mitigation}</p>

        <h3 className="text-lg font-medium mb-2">BookIt API</h3>
        <p className="mb-4">{SOW_TEMPLATES.addendum.bookItApi.overview}</p>
        <p className="mb-4">{SOW_TEMPLATES.addendum.bookItApi.risks}</p>
        <p className="mb-4">{SOW_TEMPLATES.addendum.bookItApi.mitigation}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {renderSection('Introduction', SOW_TEMPLATES.introduction)}
      {renderScope()}
      {renderRoles()}
      {renderSection('Pricing', SOW_TEMPLATES.pricing)}
    </div>
  );
} 