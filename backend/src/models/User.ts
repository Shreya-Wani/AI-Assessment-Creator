import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  schoolName: string;
  location: string;
  avatarUrl?: string;
  role: 'TEACHER';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  schoolName: { type: String, required: true },
  location: { type: String, required: true },
  avatarUrl: { type: String },
  role: { type: String, enum: ['TEACHER'], default: 'TEACHER' }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
