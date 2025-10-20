import mongoose, { Schema, Document } from 'mongoose';

export interface ITerm extends Document {
  site_id: mongoose.Schema.Types.ObjectId;
  taxonomy: string; // e.g., 'category', 'tag'
  name: string; // Display name
  slug: string; // URL-friendly name
  description?: string;
  parent_id?: mongoose.Schema.Types.ObjectId; // For hierarchical taxonomies
  count: number; // Number of posts using this term
  meta: Map<string, any>; // Flexible key-value storage for term meta
  created_at: Date;
  updated_at: Date;
}

const TermSchema: Schema = new Schema({
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  taxonomy: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Term' },
  count: { type: Number, default: 0 },
  meta: { type: Map, of: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Indexes for performance
TermSchema.index({ site_id: 1, taxonomy: 1 });
TermSchema.index({ site_id: 1, taxonomy: 1, slug: 1 }, { unique: true });
TermSchema.index({ site_id: 1, taxonomy: 1, parent_id: 1 });

// Update timestamp on save
TermSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.Term || mongoose.model<ITerm>('Term', TermSchema);

