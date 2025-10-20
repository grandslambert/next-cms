import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  _id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  filename: string;
  original_filename: string;
  filepath: string;
  mimetype: string;
  filesize: number;
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string;
  uploaded_by: mongoose.Types.ObjectId;
  folder_id: mongoose.Types.ObjectId | null;
  status: string; // 'active' or 'trash'
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const MediaSchema: Schema = new Schema(
  {
    site_id: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    original_filename: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    filesize: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    alt_text: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folder_id: {
      type: Schema.Types.ObjectId,
      ref: 'MediaFolder',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'trash'],
      default: 'active',
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for efficient queries
MediaSchema.index({ site_id: 1, status: 1 });

const Media = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);

export default Media;

