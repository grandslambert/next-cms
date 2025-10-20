import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMenuLocation extends Document {
  _id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  name: string;
  display_name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

const MenuLocationSchema: Schema = new Schema(
  {
    site_id: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    display_name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'menu_locations', // Global collection
  }
);

// Compound index to ensure a location name is unique per site
MenuLocationSchema.index({ site_id: 1, name: 1 }, { unique: true });

const MenuLocation: Model<IMenuLocation> = mongoose.models.MenuLocation || mongoose.model<IMenuLocation>('MenuLocation', MenuLocationSchema);

export default MenuLocation;

