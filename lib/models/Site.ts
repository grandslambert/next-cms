import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISite extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  display_name: string;
  description?: string;
  domain?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SiteSchema: Schema = new Schema(
  {
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

const Site: Model<ISite> = mongoose.models.Site || mongoose.model<ISite>('Site', SiteSchema);

export default Site;

