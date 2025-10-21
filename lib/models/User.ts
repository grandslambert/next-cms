import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar?: string;
  role: mongoose.Schema.Types.ObjectId; // Reference to Role
  is_super_admin: boolean;
  status: 'active' | 'inactive' | 'pending';
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      default: '',
    },
    last_name: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    is_super_admin: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
      index: true,
    },
    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users', // Global collection, not site-specific
  }
);

// Index for searching
UserSchema.index({ username: 'text', email: 'text', first_name: 'text', last_name: 'text' });

// Virtual for full name
UserSchema.virtual('full_name').get(function () {
  return `${this.first_name || ''} ${this.last_name || ''}`.trim();
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Legacy default export for backwards compatibility
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

