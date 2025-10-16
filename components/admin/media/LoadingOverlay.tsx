interface LoadingOverlayProps {
  readonly isVisible: boolean;
  readonly message?: string;
}

export default function LoadingOverlay({ isVisible, message = 'Processing...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
          <p className="text-lg font-medium text-gray-900">{message}</p>
        </div>
      </div>
    </div>
  );
}

