import mongoose, { Schema, Document } from 'mongoose';

export interface IPostMeta extends Document {
  _id: mongoose.Types.ObjectId;
  post_id: mongoose.Types.ObjectId;
  meta_key: string;
  meta_value: string;
  created_at: Date;
  updated_at: Date;
}

export const PostMetaSchema: Schema = new Schema(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    meta_key: {
      type: String,
      required: true,
      index: true,
    },
    meta_value: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for efficient queries
PostMetaSchema.index({ post_id: 1, meta_key: 1 }, { unique: true });

const PostMeta = mongoose.models.PostMeta || mongoose.model<IPostMeta>('PostMeta', PostMetaSchema);

export default PostMeta;

