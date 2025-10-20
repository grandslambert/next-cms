import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxonomy extends Document {
  site_id: mongoose.Schema.Types.ObjectId;
  name: string; // Internal name (e.g., 'category', 'tag', 'genre')
  slug: string; // URL-friendly name
  labels: {
    singular_name: string; // e.g., 'Category'
    plural_name: string; // e.g., 'Categories'
    all_items: string; // e.g., 'All Categories'
    edit_item: string; // e.g., 'Edit Category'
    add_new_item: string; // e.g., 'Add New Category'
  };
  description?: string;
  is_hierarchical: boolean; // Can terms have parent/child relationships?
  is_public: boolean; // Visible on frontend?
  show_in_dashboard: boolean; // Show in dashboard?
  post_types: string[]; // Which post types use this taxonomy
  rewrite_slug?: string; // Custom URL slug
  created_at: Date;
  updated_at: Date;
}

const TaxonomySchema: Schema = new Schema({
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  labels: {
    singular_name: { type: String, required: true },
    plural_name: { type: String, required: true },
    all_items: { type: String, required: true },
    edit_item: { type: String, required: true },
    add_new_item: { type: String, required: true },
  },
  description: { type: String, trim: true },
  is_hierarchical: { type: Boolean, default: false },
  is_public: { type: Boolean, default: true },
  show_in_dashboard: { type: Boolean, default: true },
  post_types: [{ type: String }],
  rewrite_slug: { type: String, trim: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Compound index for fast lookups by site and name
TaxonomySchema.index({ site_id: 1, name: 1 }, { unique: true });
TaxonomySchema.index({ site_id: 1, slug: 1 }, { unique: true });

// Update timestamp on save
TaxonomySchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.Taxonomy || mongoose.model<ITaxonomy>('Taxonomy', TaxonomySchema);

