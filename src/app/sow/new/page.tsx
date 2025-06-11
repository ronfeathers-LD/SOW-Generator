import SOWForm from '@/components/SOWForm';

export default function NewSOWPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create New Statement of Work</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill out the form below to create a new SOW
          </p>
        </div>
        
        <div className="mt-8">
          <SOWForm />
        </div>
      </div>
    </div>
  );
} 