import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  model: String,
  text: String,
  score: Number,
  best: Boolean,
  heuristicScore: Number,
  judgeScore: Number,
}, { _id: false });

const historySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  responses: [responseSchema],
  judgeData: {
    bestIndex: Number,
    reasoning: String,
    scores: [Number],
    analysis: String,
  },
}, { timestamps: true });

// Index for efficient querying
historySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PromptHistory', historySchema);
