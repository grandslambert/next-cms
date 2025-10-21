import mongoose, { Schema, Document } from 'mongoose';

export interface IPostType extends Document {
  name: string; // Internal name (e.g., 'post', 'page', 'product')
  slug: string; // URL-friendly name
  labels: {
    singular_name: string; // e.g., 'Post'
    plural_name: string; // e.g., 'Posts'
    add_new: string; // e.g., 'Add New Post'
    edit_item: string; // e.g., 'Edit Post'
    view_item: string; // e.g., 'View Post'
  };
  description?: string;
  is_hierarchical: boolean; // Can posts have parent/child relationships?
  is_public: boolean; // Visible on frontend?
  supports: string[]; // Features: 'title', 'editor', 'thumbnail', 'excerpt', 'comments', 'custom_fields'
  menu_icon?: string; // Icon for admin menu
  menu_position?: number; // Position in admin menu
  show_in_dashboard: boolean; // Show in dashboard?
  has_archive: boolean; // Enable archive page?
  rewrite_slug?: string; // Custom URL slug for archive
  taxonomies: string[]; // Associated taxonomy names (e.g., ['category', 'tag'])
  created_at: Date;
  updated_at: Date;
}

export const PostTypeSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  labels: {
    singular_name: { type: String, required: true },
    plural_name: { type: String, required: true },
    add_new: { type: String, required: true },
    edit_item: { type: String, required: true },
    view_item: { type: String, required: true },
  },
  description: { type: String, trim: true },
  is_hierarchical: { type: Boolean, default: false },
  is_public: { type: Boolean, default: true },
  supports: [{ type: String }],
  menu_icon: { type: String, trim: true },
  menu_position: { type: Number },
  show_in_dashboard: { type: Boolean, default: true },
  has_archive: { type: Boolean, default: true },
  rewrite_slug: { type: String, trim: true },
  taxonomies: [{ type: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Unique indexes for name and slug (database isolation ensures per-site uniqueness)
PostTypeSchema.index({ name: 1 }, { unique: true });
PostTypeSchema.index({ slug: 1 }, { unique: true });

// Update timestamp on save
PostTypeSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.PostType || mongoose.model<IPostType>('PostType', PostTypeSchema);

