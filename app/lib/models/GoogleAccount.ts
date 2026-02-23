import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IGoogleAccount extends Document {
  sessionId: string
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
    sessionId:    { type: String, required: true },
    googleId:     { type: String, required: true },
    email:        { type: String, required: true },
    name:         { type: String, required: true },
    picture:      { type: String, default: '' },
    accessToken:  { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt:    { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Each session can connect the same Google account independently
schema.index({ googleId: 1, sessionId: 1 }, { unique: true })

const GoogleAccount: Model<IGoogleAccount> =
  mongoose.models.GoogleAccount ||
  mongoose.model<IGoogleAccount>('GoogleAccount', schema)

export default GoogleAccount
