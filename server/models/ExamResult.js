import mongoose from 'mongoose'

const examResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  examId: String,
  title: String,
  subject: String,
  score: Number,
  total: Number,
  percentage: Number,
  timeTaken: Number, // in seconds
  answers: [
    {
      questionId: String,
      question: String,
      selectedAnswers: [String],
      correctAnswers: [String],
      isCorrect: Boolean,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const ExamResult = mongoose.model('ExamResult', examResultSchema)

export default ExamResult
