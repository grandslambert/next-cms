import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  site_id: mongoose.Schema.Types.ObjectId;
  post_type: string; // e.g., 'post', 'page', 'product'
  title: string;
  slug: string; // URL-friendly name
  content?: string; // Main content body
  excerpt?: string; // Short summary
  status: 'draft' | 'published' | 'pending' | 'trash';
  visibility: 'public' | 'private' | 'password_protected';
  password?: string; // For password-protected posts
  author_id: mongoose.Schema.Types.ObjectId; // Reference to User
  parent_id?: mongoose.Schema.Types.ObjectId; // For hierarchical posts (pages)
  featured_image_id?: mongoose.Schema.Types.ObjectId; // Reference to Media
  custom_fields: Map<string, any>; // Flexible key-value storage for post meta
  comment_status: 'open' | 'closed';
  comment_count: number;
  view_count: number;
  order: number; // For manual ordering
  published_at?: Date; // When published (null if draft)
  scheduled_at?: Date; // For scheduled publishing
  created_at: Date;
  updated_at: Date;
}

const PostSchema: Schema = new Schema({
  site_id: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
  post_type: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  content: { type: String },
  excerpt: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'pending', 'trash'], 
    default: 'draft' 
  },
  visibility: { 
    type: String, 
    enum: ['public', 'private', 'password_protected'], 
    default: 'public' 
  },
  password: { type: String, select: false }, // Not returned by default
  author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Post' },
  featured_image_id: { type: Schema.Types.ObjectId, ref: 'Media' },
  custom_fields: { type: Map, of: Schema.Types.Mixed, default: {} },
  comment_status: { 
    type: String, 
    enum: ['open', 'closed'], 
    default: 'open' 
  },
  comment_count: { type: Number, default: 0 },
  view_count: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  published_at: { type: Date },
  scheduled_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Indexes for performance
PostSchema.index({ site_id: 1, post_type: 1, status: 1 });
PostSchema.index({ site_id: 1, slug: 1 }, { unique: true });
PostSchema.index({ site_id: 1, author_id: 1 });
PostSchema.index({ site_id: 1, parent_id: 1 });
PostSchema.index({ site_id: 1, published_at: -1 }); // For sorting by date
PostSchema.index({ site_id: 1, post_type: 1, published_at: -1 }); // Common query

// Update timestamp on save
PostSchema.pre('save', function (next) {
  this.updated_at = new Date();
  
  // Auto-set published_at when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.published_at) {
    this.published_at = new Date();
  }
  
  next();
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

