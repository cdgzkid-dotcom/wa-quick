import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IScheduledMessage extends Document {
  phoneNumber: string
  countryCode: string
  message: string
  scheduledAt: Date
  sent: boolean
  notified: boolean
  createdAt: Date
  updatedAt: Date
}

const ScheduledMessageSchema = new Schema<IScheduledMessage>(
  {
    phoneNumber: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, trim: true },
    message: { type: String, default: '', trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    sent: { type: Boolean, default: false, index: true },
    notified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

ScheduledMessageSchema.index({ scheduledAt: 1, sent: 1 })

const ScheduledMessage: Model<IScheduledMessage> =
  mongoose.models.ScheduledMessage ||
  mongoose.model<IScheduledMessage>('ScheduledMessage', ScheduledMessageSchema)

export default ScheduledMessage
