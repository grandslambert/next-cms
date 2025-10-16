interface UploadProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface MediaUploadProgressProps {
  uploadProgress: UploadProgress[];
}

export default function MediaUploadProgress({ uploadProgress }: MediaUploadProgressProps) {
  if (uploadProgress.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {uploadProgress.map((file, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{file.name}</span>
              {file.status === 'completed' && (
                <span className="text-green-600">✓</span>
              )}
              {file.status === 'error' && (
                <span className="text-red-600">✗</span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {file.status === 'uploading' && `${file.progress}%`}
              {file.status === 'completed' && 'Complete'}
              {file.status === 'error' && 'Failed'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                file.status === 'completed' 
                  ? 'bg-green-500' 
                  : file.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-primary-600'
              }`}
              style={{ width: `${file.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

