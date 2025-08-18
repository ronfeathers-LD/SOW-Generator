import Image from 'next/image';

interface SOWTitlePageProps {
  clientName: string;
  clientLogo?: string;
  clientSignature?: {
    name: string;
    title: string;
    email: string;
    date?: string;
  };
  clientSignature2?: {
    name: string;
    title: string;
    email: string;
    date?: string;
  };
  leandataSignature?: {
    name: string;
    title: string;
    email: string;
    date?: string;
  };
}

export default function SOWTitlePage({
  clientName,
  clientLogo,
  clientSignature,
  clientSignature2,
  leandataSignature
}: SOWTitlePageProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
        {/* LeanData Logo */}
        <div className="w-full flex justify-center mb-4">
          <div className="relative w-80 h-24">
            <Image
              src="/images/leandata-logo.png"
              alt="LeanData logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        {/* LeanData Delivery Methodology */}
        <h2 className="text-xl font-bold text-center mb-12">LeanData Delivery Methodology</h2>
        {/* Statement of Work Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Statement of Work</h1>
          <div className="text-3xl">
            prepared for <span className={`font-bold ${!clientName || clientName === 'Not Entered' ? 'text-red-600 font-bold' : ''}`}>{clientName || 'Not Entered'}</span>
          </div>
        </div>
        {/* Client Logo */}
        {(clientLogo ?? '').length > 0 && (
          <div className="w-full flex justify-center mb-8">
            <div className="relative w-96 h-32">
              <Image
                src={clientLogo ?? ''}
                alt={`${clientName} logo`}
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
        {/* Signature Blocks */}
        <div className="w-full max-w-3xl mt-16 space-y-16">
          {/* Client Signature */}
          <div>
            <p className="my-2">This SOW is accepted by {clientName}:</p>
            <div className="grid grid-cols-2 gap-8 items-end">
              {/* Signature Line */}
              <div className="flex flex-col items-start">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-left">
                  {(() => {
                    return [
                      <span key="name" className={!clientSignature?.name || clientSignature.name === 'Not Entered' ? 'text-red-600 font-bold' : ''}>
                        {clientSignature?.name || '<FIRSTNAME LASTNAME>'}
                      </span>,
                      <span key="title" className={!clientSignature?.title || clientSignature?.title === 'Title Not Entered' ? 'text-red-600 font-bold' : ''}>
                        {clientSignature?.title || '<TITLE>'}
                      </span>
                    ].filter(Boolean).map((item, index) => (
                      <span key={`client-signature-${index}`}>
                        {item}
                        {index < 1 && clientSignature?.name && clientSignature?.title && ', '}
                      </span>
                    ));
                  })()}
                  <br />
                  <span className={!clientSignature?.email || clientSignature?.email === 'Email Not Entered' ? 'text-red-600 font-bold' : ''}>
                    {clientSignature?.email || '<EMAIL>'}
                  </span>
                </div>
              </div>
              {/* Date Line */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-center">
                  {clientSignature?.date || 'DATE'}
                  <br /><br />
                </div>
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
                      <span key="name" className={!clientSignature2.name || clientSignature2.name === 'Not Entered' ? 'text-red-600 font-bold' : ''}>
                        {clientSignature2.name || '<FIRSTNAME LASTNAME>'}
                      </span>,
                      <span key="title" className={!clientSignature2.title || clientSignature2.title === 'Title Not Entered' ? 'text-red-600 font-bold' : ''}>
                        {clientSignature2.title || '<TITLE>'}
                      </span>
                    ].filter(Boolean).map((item, index) => (
                      <span key={`client-signature2-${index}`}>
                        {item}
                        {index < 1 && clientSignature2.name && clientSignature2.title && ', '}
                      </span>
                    ))}
                    <br />
                    <span className={!clientSignature2.email || clientSignature2.email === 'Email Not Entered' ? 'text-red-600 font-bold' : ''}>
                    {clientSignature2.email || '<EMAIL>'}
                  </span>
                  </div>
                </div>
                {/* Date Line */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                  <div className="text-sm mt-2 text-center">DATE<br /><br /></div>
                </div>
              </div>
            </div>
          )}
          {/* LeanData Signature */}
          <div>
            <p className="my-2">This SOW is accepted by LeanData, Inc.:</p>
            <div className="grid grid-cols-2 gap-8 items-end">
              {/* Signature Line */}
              <div className="flex flex-col items-start">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-left">
                  {[
                    (leandataSignature?.name || 'Agam Vasani'),
                    (leandataSignature?.title || 'VP Customer Success')
                  ].filter(Boolean).join(', ')}
                  <br />
                  {leandataSignature?.email || 'agam.vasani@leandata.com'}
                </div>
              </div>
              {/* Date Line */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-center">DATE<br /><br /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 