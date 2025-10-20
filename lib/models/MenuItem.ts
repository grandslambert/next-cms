import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMenuItem extends Document {
  _id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  menu_id: mongoose.Types.ObjectId;
  parent_id?: mongoose.Types.ObjectId;
  type: 'custom' | 'post_type' | 'taxonomy' | 'post' | 'term';
  object_id?: mongoose.Types.ObjectId; // Reference to PostType, Taxonomy, Post, or Term
  custom_url?: string;
  custom_label?: string;
  menu_order: number;
  target: string;
  title_attr?: string;
  css_classes?: string;
  xfn?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

const MenuItemSchema: Schema = new Schema(
  {
    site_id: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    menu_id: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
      index: true,
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      default: null,
    },
    type: {
      type: String,
      enum: ['custom', 'post_type', 'taxonomy', 'post', 'term'],
      required: true,
    },
    object_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    custom_url: {
      type: String,
      default: '',
    },
    custom_label: {
      type: String,
      default: '',
    },
    menu_order: {
      type: Number,
      default: 0,
      index: true,
    },
    target: {
      type: String,
      default: '_self',
    },
    title_attr: {
      type: String,
      default: '',
    },
    css_classes: {
      type: String,
      default: '',
    },
    xfn: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'menu_items', // Global collection
  }
);

const MenuItem: Model<IMenuItem> = mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

export default MenuItem;

