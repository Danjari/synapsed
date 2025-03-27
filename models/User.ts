// models/User.ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import { UserRole } from '../auth';

// Define the interface for User document
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: UserRole;
  emailVerified?: Date;
  classes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the User schema
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false, // Not required if using OAuth
    },
    image: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['professor', 'student'],
      required: true,
      default: 'student',
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    classes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Create or get the User model
const User: Model<IUser> = mongoose.models.User as Model<IUser> || mongoose.model<IUser>('User', UserSchema);

export default User;