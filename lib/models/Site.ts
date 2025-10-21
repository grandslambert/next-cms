import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISite extends Document {
  _id: mongoose.Types.ObjectId;
  id: number; // Sequential numeric ID for database naming (nextcms_site{id})
  name: string;
  display_name: string;
  description?: string;
  domain?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const SiteSchema: Schema = new Schema(
  {
    id: {
      type: Number,
      required: false, // Set by pre-save hook
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    display_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    domain: {
      type: String,
      default: '',
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'sites', // Global collection
  }
);

// Index for searching
SiteSchema.index({ name: 'text', display_name: 'text', description: 'text' });

// Auto-increment ID before creating new site
SiteSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    // Get the highest ID and increment
    const SiteModel = this.constructor as Model<ISite>;
    const lastSite = await SiteModel.findOne({}).sort({ id: -1 }).limit(1);
    this.id = lastSite ? lastSite.id + 1 : 1;
  }
  next();
});

const Site: Model<ISite> = mongoose.models.Site || mongoose.model<ISite>('Site', SiteSchema);

export default Site;

