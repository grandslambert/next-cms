import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMenu extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  display_name: string;
  location: string;
  created_at: Date;
  updated_at: Date;
}

export const MenuSchema: Schema = new Schema(
  {
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

// Unique index to ensure a location can only have one menu
MenuSchema.index({ location: 1 }, { unique: true });

const Menu: Model<IMenu> = mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);

export default Menu;

