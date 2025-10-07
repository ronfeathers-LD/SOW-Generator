
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
            src="data:image/png;base64,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"
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
              <div className="text-sm mt-2 text-left">
                                  {[
                    <strong key="name" className={!clientSignature?.name || clientSignature.name === 'Not Entered' ? 'text-red-600 font-bold' : ''}>
                      {clientSignature?.name || '<FIRSTNAME LASTNAME>'}
                    </strong>,
                    <br key="break" />,
                    <span key="title" className={!clientSignature?.title || clientSignature?.title === 'Title Not Entered' ? 'text-red-600 font-bold' : ''}>
                      {clientSignature?.title || '<TITLE>'}
                    </span>
                  ].filter(Boolean).map((item, index) => (
                    <span key={`client-signature-${index}`}>
                      {item}
                      {index < 1 && clientSignature?.name && clientSignature?.title && ' '}
                    </span>
                  ))}
                <br />
                <span className={!clientSignature?.email || clientSignature?.email === 'Email Not Entered' ? 'text-red-600 font-bold' : ''}>
                  {clientSignature?.email || '<EMAIL>'}
                </span>
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
                <div className="text-sm mt-2 text-left">
                  {[
                    <strong key="name" className={!clientSignature2.name || clientSignature2.name === 'Not Entered' ? 'text-red-600 font-bold' : ''}>
                      {clientSignature2.name || '<FIRSTNAME LASTNAME>'}
                    </strong>,
                    <br key="break" />,
                    <span key="title" className={!clientSignature2.title || clientSignature2.title === 'Title Not Entered' ? 'text-red-600 font-bold' : ''}>
                      {clientSignature2.title || '<TITLE>'}
                    </span>
                  ].filter(Boolean).map((item, index) => (
                    <span key={`client-signature2-${index}`}>
                      {item}
                      {index < 1 && clientSignature2.name && clientSignature2.title && ' '}
                    </span>
                  ))}
                  <br />
                  <span className={!clientSignature2.email || clientSignature2.email === 'Email Not Entered' ? 'text-red-600 font-bold' : ''}>
                    {clientSignature2.email || '<EMAIL>'}
                  </span>
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