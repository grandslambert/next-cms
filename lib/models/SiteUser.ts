import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISiteUser extends Document {
  _id: mongoose.Types.ObjectId;
  site_id: number;
  user_id: mongoose.Types.ObjectId;
  role_id: mongoose.Types.ObjectId;
  assigned_at: Date;
}

export const SiteUserSchema: Schema = new Schema(
  {
    site_id: {
      type: Number,
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role_id: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: 'site_users', // Global collection
  }
);

// Compound index to ensure a user can only be assigned to a site once
SiteUserSchema.index({ site_id: 1, user_id: 1 }, { unique: true });

const SiteUser: Model<ISiteUser> = mongoose.models.SiteUser || mongoose.model<ISiteUser>('SiteUser', SiteUserSchema);

export default SiteUser;

