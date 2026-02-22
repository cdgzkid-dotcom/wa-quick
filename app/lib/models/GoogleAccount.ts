import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IGoogleAccount extends Document {
  googleId: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
  createdAt: Date
}

const schema = new Schema<IGoogleAccount>(
  {
    googleId:     { type: String, required: true, unique: true },
    email:        { type: String, required: true },
    name:         { type: String, required: true },
    picture:      { type: String, default: '' },
    accessToken:  { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt:    { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const GoogleAccount: Model<IGoogleAccount> =
  mongoose.models.GoogleAccount ||
  mongoose.model<IGoogleAccount>('GoogleAccount', schema)

export default GoogleAccount
