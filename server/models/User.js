import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const examHistorySchema = new mongoose.Schema({
  examId: String,
  title: String,
  subject: String,
  score: Number,
  total: Number,
  timeTaken: Number,
  date: { type: Date, default: Date.now },
  questionsAnswered: [
    {
      questionId: String,
      question: String,
      selectedAnswers: [String],
      correctAnswers: [String],
      isCorrect: Boolean,
    },
  ],
})

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  name: {
    type: String,
    trim: true,
  },
  examHistory: [examHistorySchema],
  // Streak tracking
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastExamDate: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)

export default User
