import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaFolder extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  parent_id: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

export const MediaFolderSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'MediaFolder',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Index for efficient queries
MediaFolderSchema.index({ name: 1 });
MediaFolderSchema.index({ parent_id: 1 });

const MediaFolder = mongoose.models.MediaFolder || mongoose.model<IMediaFolder>('MediaFolder', MediaFolderSchema);

export default MediaFolder;

