import GoogleDriveSearch from '@/components/GoogleDriveSearch';

export default function GoogleDriveDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Google Drive + Gemini AI Demo
          </h1>
          <p className="text-gray-600 mt-1">
            Experience intelligent folder search powered by Google Drive API and Gemini AI
          </p>
        </div>
      </div>
      
      <GoogleDriveSearch />
    </div>
  );
}
