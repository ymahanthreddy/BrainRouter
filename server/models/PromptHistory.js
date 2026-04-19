import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  model: String,
  text: String,
  score: Number,
  best: Boolean,
  heuristicScore: Number,
  judgeScore: Number,
}, { _id: false });

const followUpSchema = new mongoose.Schema({
  prompt: String,
  responses: [responseSchema],
  judgeData: {
    bestIndex: Number,
    reasoning: String,
    scores: [Number],
    analysis: String,
  },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const historySchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  responses: [responseSchema],
  judgeData: {
    bestIndex: Number,
    reasoning: String,
    scores: [Number],
    analysis: String,
  },
  followUps: [followUpSchema]
}, { timestamps: true });

// Index for efficient querying
historySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PromptHistory', historySchema);
