

/**
 * LoadingModal - A reusable loading modal component that prevents user interaction
 * 
 * Usage Examples:
 * 
 * // Basic usage with custom message
 * <LoadingModal 
 *   isOpen={isLoading} 
 *   title="Processing..." 
 *   message="Please wait while we process your request."
 * />
 * 
 * // Using predefined operation types
 * <LoadingModal 
 *   isOpen={isSaving} 
 *   operation="saving"
 *   message="Saving your changes to the database..."
 * />
 * 
 * // Loading data
 * <LoadingModal 
 *   isOpen={isLoadingData} 
 *   operation="loading"
 *   message="Fetching data from the server..."
 * />
 * 
 * // Custom size
 * <LoadingModal 
 *   isOpen={isProcessing} 
 *   operation="processing"
 *   size="lg"
 * />
 * 
 * // No spinner, just text
 * <LoadingModal 
 *   isOpen={isWaiting} 
 *   title="Please Wait"
 *   message="This operation may take a few moments..."
 *   showSpinner={false}
 * />
 */

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  showSpinner?: boolean;
  size?: 'sm' | 'md' | 'lg';
  operation?: 'saving' | 'loading' | 'processing' | 'updating' | 'deleting' | 'custom';
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  title,
  message,
  showSpinner = true,
  size = 'md',
  operation = 'custom'
}) => {
  if (!isOpen) return null;

  // Default messages based on operation type
  const getDefaultContent = () => {
    switch (operation) {
      case 'saving':
        return {
          title: 'Saving Changes...',
          message: 'Please wait while we save your changes to the database.'
        };
      case 'loading':
        return {
          title: 'Loading Data...',
          message: 'Please wait while we fetch the requested information.'
        };
      case 'processing':
        return {
          title: 'Processing Request...',
          message: 'Please wait while we process your request.'
        };
      case 'updating':
        return {
          title: 'Updating...',
          message: 'Please wait while we update the information.'
        };
      case 'deleting':
        return {
          title: 'Deleting...',
          message: 'Please wait while we remove the selected item.'
        };
      default:
        return {
          title: title || 'Loading...',
          message: message || 'Please wait while we process your request.'
        };
    }
  };

  const { title: displayTitle, message: displayMessage } = getDefaultContent();

  const sizeClasses = {
    sm: 'w-11/12 md:w-1/3 lg:w-1/4',
    md: 'w-11/12 md:w-1/2 lg:w-1/3',
    lg: 'w-11/12 md:w-3/4 lg:w-1/2'
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
      <div className={`relative top-20 mx-auto p-6 border ${sizeClasses[size]} shadow-lg rounded-md bg-white`}>
        <div className="text-center">
          {/* Enhanced Loading Spinner */}
          {showSpinner && (
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          )}
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {displayTitle}
          </h3>
          
          {/* Message */}
          {displayMessage && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {displayMessage}
            </p>
          )}
          
          {/* Optional: Add a subtle animation */}
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
