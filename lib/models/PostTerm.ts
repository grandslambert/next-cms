import mongoose, { Schema, Document } from 'mongoose';

/**
 * PostTerm Model
 * Represents the many-to-many relationship between Posts and Terms
 * (Replaces the term_relationships table from MySQL)
 */

export interface IPostTerm extends Document {
  post_id: mongoose.Schema.Types.ObjectId;
  term_id: mongoose.Schema.Types.ObjectId;
  taxonomy: string; // Denormalized for faster queries
  order: number; // For manually ordering terms within a post
  created_at: Date;
}

export const PostTermSchema: Schema = new Schema({
  post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  term_id: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
  taxonomy: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

// Indexes for performance - critical for fast lookups
PostTermSchema.index({ post_id: 1 });
PostTermSchema.index({ term_id: 1 });
PostTermSchema.index({ taxonomy: 1 });
PostTermSchema.index({ post_id: 1, term_id: 1 }, { unique: true }); // Prevent duplicates

export default mongoose.models.PostTerm || mongoose.model<IPostTerm>('PostTerm', PostTermSchema);

