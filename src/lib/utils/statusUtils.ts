export const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'in_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'recalled': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Draft';
    case 'in_review': return 'In Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'recalled': return 'Recalled';
    default: return status;
  }
};
