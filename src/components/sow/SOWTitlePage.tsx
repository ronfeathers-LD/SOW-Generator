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
          <h1 className="text-5xl font-bold mb-2">Statement of Work</h1>
          <div className="text-2xl">
            prepared for <span className="font-bold">{clientName}</span>
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
            <p className="mb-2">This SOW is accepted by {clientName}:</p>
            <div className="grid grid-cols-2 gap-8 items-end">
              {/* Signature Line */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-center">
                  {[
                    (clientSignature?.name || '<FIRSTNAME LASTNAME>'),
                    (clientSignature?.title || '<TITLE>')
                  ].filter(Boolean).join(', ')}
                  <br />
                  {clientSignature?.email || '<EMAIL>'}
                </div>
              </div>
              {/* Date Line */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-center">DATE<br /><br /></div>
              </div>
            </div>
          </div>
          {/* LeanData Signature */}
          <div>
            <p className="mb-2">This SOW is accepted by LeanData, Inc.:</p>
            <div className="grid grid-cols-2 gap-8 items-end">
              {/* Signature Line */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
                <div className="text-sm mt-2 text-center">
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