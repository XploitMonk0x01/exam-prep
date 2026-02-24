import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  id: String,
  question: String,
  options: [String],
  correctAnswers: [String],
  type: { type: String, enum: ['single', 'multi'] },
  explanation: String,
  topic: String,
})

const leaderboardEntrySchema = new mongoose.Schema({
  nickname: { type: String, required: true },
  score: Number,
  total: Number,
  percentage: Number,
  timeTaken: Number,
  submittedAt: { type: Date, default: Date.now },
})

const savedExamSchema = new mongoose.Schema({
  // null = anonymous / pre-seeded
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  title: { type: String, required: true },
  subject: String,
  questions: [questionSchema],
  timeLimit: Number, // seconds
  // Sharing
  shareId: { type: String, unique: true, sparse: true },
  isPublic: { type: Boolean, default: false },
  leaderboard: [leaderboardEntrySchema],
  createdAt: { type: Date, default: Date.now },
})

const SavedExam = mongoose.model('SavedExam', savedExamSchema)

export default SavedExam
