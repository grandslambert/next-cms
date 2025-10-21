import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any; // Can be string, number, boolean, object, etc.
  type: 'string' | 'number' | 'boolean' | 'json' | 'text';
  group: string; // e.g., 'general', 'media', 'authentication', 'menus'
  label?: string;
  description?: string;
  is_public: boolean; // Whether setting can be accessed by frontend
  created_at: Date;
  updated_at: Date;
}

export const SettingSchema: Schema = new Schema({
  key: { type: String, required: true, trim: true },
  value: { type: Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['string', 'number', 'boolean', 'json', 'text'], default: 'string' },
  group: { type: String, required: true, trim: true },
  label: { type: String, trim: true },
  description: { type: String, trim: true },
  is_public: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Indexes for fast lookups
SettingSchema.index({ key: 1 }, { unique: true });
SettingSchema.index({ group: 1 });

// Update timestamp on save
SettingSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);

