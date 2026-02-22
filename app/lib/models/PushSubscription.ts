import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPushSubscription extends Document {
  endpoint: string
  p256dh: string
  auth: string
  createdAt: Date
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)

export default PushSubscription
