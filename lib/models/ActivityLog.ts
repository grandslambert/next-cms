import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  user_id: mongoose.Schema.Types.ObjectId | string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  details?: string;
  changes_before?: string;
  changes_after?: string;
  ip_address?: string;
  user_agent?: string;
  site_id?: mongoose.Schema.Types.ObjectId | string;
  created_at: Date;
}

const ActivityLogSchema: Schema = new Schema({
  user_id: { type: Schema.Types.Mixed, required: true }, // Can be ObjectId or string for flexibility
  action: { type: String, required: true, index: true },
  entity_type: { type: String, required: true, index: true },
  entity_id: { type: String },
  entity_name: { type: String },
  details: { type: String },
  changes_before: { type: String },
  changes_after: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
  site_id: { type: Schema.Types.Mixed }, // Can be ObjectId or string for flexibility
  created_at: { type: Date, default: Date.now, index: true },
});

// Create compound indexes for common queries
ActivityLogSchema.index({ user_id: 1, created_at: -1 });
ActivityLogSchema.index({ site_id: 1, created_at: -1 });
ActivityLogSchema.index({ entity_type: 1, entity_id: 1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

