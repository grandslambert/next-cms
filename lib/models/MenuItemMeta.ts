import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItemMeta extends Document {
  _id: mongoose.Types.ObjectId;
  menu_item_id: mongoose.Types.ObjectId;
  meta_key: string;
  meta_value: string;
  created_at: Date;
  updated_at: Date;
}

const MenuItemMetaSchema: Schema = new Schema(
  {
    menu_item_id: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      index: true,
    },
    meta_key: {
      type: String,
      required: true,
      index: true,
    },
    meta_value: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for efficient queries
MenuItemMetaSchema.index({ menu_item_id: 1, meta_key: 1 }, { unique: true });

const MenuItemMeta = mongoose.models.MenuItemMeta || mongoose.model<IMenuItemMeta>('MenuItemMeta', MenuItemMetaSchema);

export default MenuItemMeta;

