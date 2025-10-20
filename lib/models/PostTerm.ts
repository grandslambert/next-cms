import mongoose, { Schema, Document } from 'mongoose';

/**
 * PostTerm Model
 * Represents the many-to-many relationship between Posts and Terms
 * (Replaces the term_relationships table from MySQL)
 */

export interface IPostTerm extends Document {
  site_id: mongoose.Schema.Types.ObjectId;
  post_id: mongoose.Schema.Types.ObjectId;
  term_id: mongoose.Schema.Types.ObjectId;
  taxonomy: string; // Denormalized for faster queries
  order: number; // For manually ordering terms within a post
  created_at: Date;
}

const PostTermSchema: Schema = new Schema({
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  term_id: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
  taxonomy: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

// Indexes for performance - critical for fast lookups
PostTermSchema.index({ site_id: 1, post_id: 1 });
PostTermSchema.index({ site_id: 1, term_id: 1 });
PostTermSchema.index({ site_id: 1, taxonomy: 1 });
PostTermSchema.index({ post_id: 1, term_id: 1 }, { unique: true }); // Prevent duplicates

export default mongoose.models.PostTerm || mongoose.model<IPostTerm>('PostTerm', PostTermSchema);

