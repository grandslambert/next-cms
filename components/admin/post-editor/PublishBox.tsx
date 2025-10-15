'use client';

interface PublishBoxProps {
  readonly status: string;
  readonly isEdit: boolean;
  readonly isSaving: boolean;
  readonly canPublish: boolean;
  readonly scheduledPublishAt: string;
  readonly scheduledDate?: string;
  readonly singularLabel: string;
  readonly onScheduleChange: (value: string) => void;
  readonly onSaveDraft: (e: React.FormEvent) => void;
  readonly onPublish: (e: React.FormEvent) => void;
  readonly onSchedule: (e: React.FormEvent) => void;
  readonly onSubmitForReview: (e: React.FormEvent) => void;
}

export default function PublishBox({
  status,
  isEdit,
  isSaving,
  canPublish,
  scheduledPublishAt,
  scheduledDate,
  singularLabel,
  onScheduleChange,
  onSaveDraft,
  onPublish,
  onSchedule,
  onSubmitForReview,
}: PublishBoxProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Publish</h3>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: <span className="font-medium">
            {status === 'published' ? 'Published' : 
             status === 'pending' ? 'Pending Review' : 
             status === 'scheduled' ? 'Scheduled' : 
             'Draft'}
          </span>
        </p>
        {status === 'scheduled' && scheduledDate && (
          <p className="text-xs text-gray-500 mt-1">
            Scheduled for: {new Date(scheduledDate).toLocaleString()}
          </p>
        )}
      </div>

      {canPublish && (
        <div className="mb-4">
          <label htmlFor="scheduled-publish" className="block text-sm font-medium text-gray-700 mb-2">
            Schedule Publish
          </label>
          <input
            id="scheduled-publish"
            type="datetime-local"
            value={scheduledPublishAt}
            onChange={(e) => onScheduleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for immediate publish
          </p>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        
        {canPublish ? (
          <>
            {scheduledPublishAt ? (
              <button
                type="button"
                onClick={onSchedule}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Schedule {singularLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={onPublish}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isEdit && status === 'published' ? 'Update' : 'Publish'} {singularLabel}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onSubmitForReview}
            disabled={isSaving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Submit for Review
          </button>
        )}
      </div>
    </div>
  );
}

