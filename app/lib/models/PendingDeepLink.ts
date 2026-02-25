import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPendingDeepLink extends Document {
  phone: string
  countryCode: string
  message: string
  subscriptionEndpoint: string
  used: boolean
  createdAt: Date
}

const PendingDeepLinkSchema = new Schema<IPendingDeepLink>(
  {
    phone: { type: String, required: true },
    countryCode: { type: String, required: true },
    message: { type: String, default: '' },
    subscriptionEndpoint: { type: String, default: '' },
    used: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

const PendingDeepLink: Model<IPendingDeepLink> =
  mongoose.models.PendingDeepLink ||
  mongoose.model<IPendingDeepLink>('PendingDeepLink', PendingDeepLinkSchema)

export default PendingDeepLink
