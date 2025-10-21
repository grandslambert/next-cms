import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMenuLocation extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  display_name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export const MenuLocationSchema: Schema = new Schema(
  {
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

// Unique index to ensure a location name is unique
MenuLocationSchema.index({ name: 1 }, { unique: true });

const MenuLocation: Model<IMenuLocation> = mongoose.models.MenuLocation || mongoose.model<IMenuLocation>('MenuLocation', MenuLocationSchema);

export default MenuLocation;

