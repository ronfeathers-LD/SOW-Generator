
import Image from 'next/image';

interface SOWTitlePageProps {
  title: string;
  clientName: string;
  companyLogo?: string;
  clientSignature?: {
    name: string;
    title: string;
    email: string;
    date: string;
  };
  clientSignature2?: {
    name: string;
    title: string;
    email: string;
    date: string;
  };
  leanDataSignature?: {
    name: string;
    title: string;
    email: string;
  };
}

/**
 * Legacy sentinel strings. Older callers passed these in place of a blank
 * value, so a SOW saved before they were removed can still carry them.
 * Treated as "not provided" rather than printed onto the document.
 */
const PLACEHOLDER_VALUES = new Set([
  'Not Entered',
  'Title Not Entered',
  'Email Not Entered',
  'None Selected',
]);

const providedOrNull = (value?: string | null): string | null => {
  const trimmed = (value ?? '').trim();
  if (trimmed === '' || PLACEHOLDER_VALUES.has(trimmed)) return null;
  return trimmed;
};

/**
 * Printed name / title / email under a customer signature line.
 *
 * A customer signer is not required to submit a SOW for approval, so a blank
 * one is a legitimate state — not an error. It renders as a single muted line
 * rather than three lines of red "Not Entered", which read as a broken
 * document on something a customer eventually sees. Reviewers are told about
 * the blank through the approval banner and the Slack notification instead.
 */
function SignatureDetails({
  signature,
}: {
  signature?: { name: string; title: string; email: string };
}) {
  const name = providedOrNull(signature?.name);
  const title = providedOrNull(signature?.title);
  const email = providedOrNull(signature?.email);

  if (!name && !title && !email) {
    return <span className="italic text-gray-400">To be provided</span>;
  }

  return (
    <>
      <strong>{name ?? <span className="font-normal italic text-gray-400">To be provided</span>}</strong>
      {title && (
        <>
          <br />
          <span>{title}</span>
        </>
      )}
      {email && (
        <>
          <br />
          <span>{email}</span>
        </>
      )}
    </>
  );
}

const SOWTitlePage: React.FC<SOWTitlePageProps> = ({
  title,
  clientName,
  companyLogo,
  clientSignature,
  clientSignature2,
  leanDataSignature
}) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8" aria-label={title ? `Statement of Work for ${clientName} (internal title: ${title})` : `Statement of Work for ${clientName}` }>
      {/* LeanData Logo */}
      <div className="w-full flex justify-center mb-6">
        <div className="relative w-80 h-24">
          <Image
            src="/images/leandata-logo.png"
            alt="LeanData logo"
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* LeanData Delivery Methodology */}
      <h2 className="text-center text-lg font-semibold text-gray-800 mb-10">LeanData Delivery Methodology</h2>

      {/* Statement of Work Heading */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Statement of Work</h1>
        <div className="text-2xl text-gray-700">
          prepared for <span className="font-bold">{clientName || 'Client'}</span>
        </div>
      </div>

      {/* Optional Client Logo (if provided) */}
      {companyLogo && companyLogo.trim().length > 0 && (
        <div className="w-full flex justify-center mb-10">
          <div className="relative w-96 h-32">
            <Image
              src={companyLogo}
              alt={`${clientName} logo`}
              fill
              sizes="(max-width: 768px) 100vw, 384px"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Signature Section */}
      <div className="w-full max-w-4xl mt-4 space-y-16">
        {/* Client Signature */}
        <div>
          <p className="my-2 text-sm">This SOW is accepted by {clientName}:</p>
          <div className="grid grid-cols-2 gap-4 items-end">
            {/* Signature Line */}
            <div className="flex flex-col items-start">
              <div className="w-full border-b border-gray-400 mb-2 mt-8 h-8"></div>
              <div className="text-sm mt-2 text-left" data-testid="customer-signature">
                <SignatureDetails signature={clientSignature} />
              </div>
            </div>
            {/* Date Line */}
            <div className="flex flex-col items-left">
              <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
              <div className="text-sm mt-2 text-left">DATE<br /><br /><br /></div>
            </div>
          </div>
        </div>

        {/* Second Client Signature (if provided) */}
        {clientSignature2 && clientSignature2.name && clientSignature2.name.trim() && (
          <div>
            <div className="grid grid-cols-2 gap-8 items-end">
              {/* Signature Line */}
              <div className="flex flex-col items-start">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-left" data-testid="customer-signature-2">
                  <SignatureDetails signature={clientSignature2} />
                </div>
              </div>
              {/* Date Line */}
              <div className="flex flex-col items-left">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-left">DATE<br /><br /><br /></div>
              </div>
            </div>
          </div>
        )}

        {/* LeanData Signature */}
        <div>
          <p className="my-2 text-sm">This SOW is accepted by LeanData, Inc.:</p>
          <div className="grid grid-cols-2 gap-8 items-end">
            {/* Signature Line */}
            <div className="flex flex-col items-start">
              <div className="w-full border-b border-gray-400 mb-2 mt-8 h-8"></div>
              <div className="text-sm mt-2 text-left">
                {leanDataSignature && leanDataSignature.name !== 'None Selected' ? (
                  <>
                    <strong className="font-bold">
                      {leanDataSignature.name}
                    </strong>
                    <br />
                    <span>
                      {leanDataSignature.title}
                    </span>
                    <br />
                    {leanDataSignature.email}
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-bold">None Selected</span>
                    <br />
                    <span className="text-red-600">Title Not Entered</span>
                    <br />
                    <span className="text-red-600">Email Not Entered</span>
                  </>
                )}
              </div>
            </div>
            {/* Date Line */}
            <div className="flex flex-col items-left">
              <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
              <div className="text-sm mt-2 text-left">DATE<br /><br /><br /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOWTitlePage; 