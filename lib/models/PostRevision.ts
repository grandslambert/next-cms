import mongoose, { Schema, Document } from 'mongoose';

export interface IPostRevision extends Document {
  _id: mongoose.Types.ObjectId;
  post_id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  excerpt: string;
  author_id: mongoose.Types.ObjectId;
  created_at: Date;
}

const PostRevisionSchema: Schema = new Schema(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    excerpt: {
      type: String,
      default: '',
    },
    author_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Index for fetching revisions by post
PostRevisionSchema.index({ post_id: 1, created_at: -1 });

const PostRevision = mongoose.models.PostRevision || mongoose.model<IPostRevision>('PostRevision', PostRevisionSchema);

export default PostRevision;

