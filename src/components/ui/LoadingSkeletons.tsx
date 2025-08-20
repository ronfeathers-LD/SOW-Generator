export const ContentSkeleton: React.FC = () => (
  <div className="prose max-w-none text-left">
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export const DetailedSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4"></div>
    <div className="space-y-2">
      <div className="h-6 bg-gray-200 rounded"></div>
      <div className="h-6 bg-gray-200 rounded"></div>
      <div className="h-6 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  </div>
);
