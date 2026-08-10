import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IHeartbeat extends Document {
  key: string
  lastPing: Date
}

const HeartbeatSchema = new Schema<IHeartbeat>({
  key: { type: String, required: true, unique: true },
  lastPing: { type: Date, required: true },
})

const Heartbeat: Model<IHeartbeat> =
  mongoose.models.Heartbeat || mongoose.model<IHeartbeat>('Heartbeat', HeartbeatSchema)

export default Heartbeat
