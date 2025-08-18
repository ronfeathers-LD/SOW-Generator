import React from 'react';
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
}

const SOWTitlePage: React.FC<SOWTitlePageProps> = ({
  title,
  clientName,
  companyLogo,
  clientSignature,
  clientSignature2
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
          <div className="grid grid-cols-2 gap-8 items-end">
            {/* Signature Line */}
            <div className="flex flex-col items-start">
              <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
              <div className="text-sm mt-2 text-left">
                {[
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
                ))}
                <br />
                <span className={!clientSignature?.email || clientSignature?.email === 'Email Not Entered' ? 'text-red-600 font-bold' : ''}>
                  {clientSignature?.email || '<EMAIL>'}
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
          <p className="my-2 text-sm">This SOW is accepted by LeanData, Inc.:</p>
          <div className="grid grid-cols-2 gap-8 items-end">
            {/* Signature Line */}
            <div className="flex flex-col items-start">
              <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
              <div className="text-sm mt-2 text-left">
                {['Agam Vasani', 'VP Customer Success'].filter(Boolean).join(', ')}
                <br />
                agam.vasani@leandata.com
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
  );
};

export default SOWTitlePage; 