import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalSetting extends Document {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'text';
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export const GlobalSettingSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['string', 'number', 'boolean', 'json', 'text'], default: 'string' },
  description: { type: String, trim: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Update timestamp on save
GlobalSettingSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.GlobalSetting || mongoose.model<IGlobalSetting>('GlobalSetting', GlobalSettingSchema);

