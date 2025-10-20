import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMenu extends Document {
  _id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  name: string;
  display_name: string;
  location: string;
  created_at: Date;
  updated_at: Date;
}

const MenuSchema: Schema = new Schema(
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
    location: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'menus', // Global collection
  }
);

// Compound index to ensure a location can only have one menu per site
MenuSchema.index({ site_id: 1, location: 1 }, { unique: true });

const Menu: Model<IMenu> = mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);

export default Menu;

