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
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
MediaFolderSchema.index({ site_id: 1, name: 1 });

const MediaFolder = mongoose.models.MediaFolder || mongoose.model<IMediaFolder>('MediaFolder', MediaFolderSchema);

export default MediaFolder;

