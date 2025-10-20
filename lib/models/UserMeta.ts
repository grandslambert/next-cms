import mongoose, { Schema, Document } from 'mongoose';

export interface IUserMeta extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  meta_key: string;
  meta_value: string;
  created_at: Date;
  updated_at: Date;
}

const UserMetaSchema: Schema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    site_id: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
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
UserMetaSchema.index({ user_id: 1, site_id: 1, meta_key: 1 }, { unique: true });

const UserMeta = mongoose.models.UserMeta || mongoose.model<IUserMeta>('UserMeta', UserMetaSchema);

export default UserMeta;

