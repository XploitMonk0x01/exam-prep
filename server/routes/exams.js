import express from 'express'
import Joi from 'joi'
import { randomUUID } from 'crypto'
import User from '../models/User.js'
import ExamResult from '../models/ExamResult.js'
import SavedExam from '../models/SavedExam.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

/* ─── helpers ─── */
function updateStreak(user) {
  const now = new Date()
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)
  const yesterdayMidnight = new Date(todayMidnight)
  yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1)

  const last = user.lastExamDate ? new Date(user.lastExamDate) : null
  if (last) last.setHours(0, 0, 0, 0)

  if (!last || last < yesterdayMidnight) {
    user.currentStreak = 1 // broke or first time
  } else if (last.getTime() === yesterdayMidnight.getTime()) {
    user.currentStreak = (user.currentStreak || 0) + 1 // continued
  }
  // same day → no change
  user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak)
  user.lastExamDate = now
}

/* ─── validation schemas ─── */
const submitSchema = Joi.object({
  examId: Joi.string().optional(),
  title: Joi.string().required(),
  subject: Joi.string().optional().allow(''),
  timeTaken: Joi.number().required(),
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),
        question: Joi.string().required(),
        selectedAnswers: Joi.array().items(Joi.string()).required(),
        correctAnswers: Joi.array().items(Joi.string()).required(),
        isCorrect: Joi.boolean().required(),
        timeSpent: Joi.number().optional(),
        flagged: Joi.boolean().optional(),
        topic: Joi.string().optional().allow(''),
      }),
    )
    .required(),
})

const bankSaveSchema = Joi.object({
  title: Joi.string().required(),
  subject: Joi.string().optional().allow(''),
  questions: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        question: Joi.string().required(),
        options: Joi.array().items(Joi.string()).required(),
        correctAnswers: Joi.array().items(Joi.string()).required(),
        type: Joi.string().valid('single', 'multi').required(),
        explanation: Joi.string().optional().allow(''),
        topic: Joi.string().optional().allow(''),
      }),
    )
    .required(),
  timeLimit: Joi.number().optional(),
})

/* ══════════════════════════════════════
   SUBMIT EXAM RESULT
══════════════════════════════════════ */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { error, value } = submitSchema.validate(req.body)
    if (error) return res.status(400).json({ error: error.details[0].message })

    const { examId, title, subject, timeTaken, answers } = value
    const userId = req.user.userId

    const score = answers.filter((a) => a.isCorrect).length
    const total = answers.length
    const percentage = parseFloat(((score / total) * 100).toFixed(2))

    const examResult = new ExamResult({
      userId,
      examId: examId || `exam_${Date.now()}`,
      title,
      subject,
      score,
      total,
      percentage,
      timeTaken,
      answers,
    })
    await examResult.save()

    const user = await User.findById(userId)
    user.examHistory.push({
      examId: examResult.examId,
      title,
      subject,
      score,
      total,
      timeTaken,
      date: examResult.createdAt,
      questionsAnswered: answers,
    })
    updateStreak(user)
    await user.save()

    res.status(201).json({
      message: 'Exam submitted successfully',
      result: { id: examResult._id, score, total, percentage, timeTaken },
      streak: { current: user.currentStreak, longest: user.longestStreak },
    })
  } catch (err) {
    console.error('Submit exam error:', err)
    res.status(500).json({ error: 'Server error during exam submission' })
  }
})

/* ══════════════════════════════════════
   EXAM HISTORY
══════════════════════════════════════ */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const results = await ExamResult.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-answers')
    res.json({ history: results })
  } catch (err) {
    console.error('Get history error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/result/:id', authenticateToken, async (req, res) => {
  try {
    const result = await ExamResult.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })
    if (!result) return res.status(404).json({ error: 'Exam result not found' })
    res.json({ result })
  } catch (err) {
    console.error('Get result error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ══════════════════════════════════════
   EXAM BANK  (authenticated)
══════════════════════════════════════ */
router.get('/bank', authenticateToken, async (req, res) => {
  try {
    const exams = await SavedExam.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-leaderboard')
    res.json({ exams })
  } catch (err) {
    console.error('Get bank error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/bank', authenticateToken, async (req, res) => {
  try {
    const { error, value } = bankSaveSchema.validate(req.body)
    if (error) return res.status(400).json({ error: error.details[0].message })

    const saved = new SavedExam({ userId: req.user.userId, ...value })
    await saved.save()
    res.status(201).json({ exam: saved })
  } catch (err) {
    console.error('Save to bank error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/bank/:id', authenticateToken, async (req, res) => {
  try {
    const exam = await SavedExam.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })
    if (!exam) return res.status(404).json({ error: 'Exam not found' })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error('Delete bank error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ══════════════════════════════════════
   SHARED EXAMS  (create, public access, leaderboard)
══════════════════════════════════════ */

// Create a shareable link (auth required)
router.post('/share', authenticateToken, async (req, res) => {
  try {
    const { error, value } = bankSaveSchema.validate(req.body)
    if (error) return res.status(400).json({ error: error.details[0].message })

    const shareId = randomUUID().replace(/-/g, '').slice(0, 12)
    const saved = new SavedExam({
      userId: req.user.userId,
      ...value,
      shareId,
      isPublic: true,
    })
    await saved.save()
    res.status(201).json({ shareId, exam: saved })
  } catch (err) {
    console.error('Share exam error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get shared exam by shareId (public — no auth)
router.get('/shared/:shareId', async (req, res) => {
  try {
    const exam = await SavedExam.findOne({
      shareId: req.params.shareId,
      isPublic: true,
    }).select('-leaderboard -userId')
    if (!exam) return res.status(404).json({ error: 'Shared exam not found' })
    res.json({ exam })
  } catch (err) {
    console.error('Get shared exam error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Submit score to shared exam leaderboard (public — no auth needed)
router.post('/shared/:shareId/score', async (req, res) => {
  try {
    const { nickname, score, total, percentage, timeTaken } = req.body
    if (!nickname || typeof score !== 'number') {
      return res.status(400).json({ error: 'nickname and score are required' })
    }

    const exam = await SavedExam.findOne({
      shareId: req.params.shareId,
      isPublic: true,
    })
    if (!exam) return res.status(404).json({ error: 'Shared exam not found' })

    exam.leaderboard.push({ nickname, score, total, percentage, timeTaken })
    await exam.save()

    const leaderboard = exam.leaderboard
      .sort((a, b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken)
      .slice(0, 20)

    res.status(201).json({ leaderboard })
  } catch (err) {
    console.error('Submit shared score error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get leaderboard for a shared exam (public)
router.get('/shared/:shareId/leaderboard', async (req, res) => {
  try {
    const exam = await SavedExam.findOne({
      shareId: req.params.shareId,
      isPublic: true,
    }).select('leaderboard title')
    if (!exam) return res.status(404).json({ error: 'Shared exam not found' })

    const leaderboard = exam.leaderboard
      .sort((a, b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken)
      .slice(0, 20)

    res.json({ title: exam.title, leaderboard })
  } catch (err) {
    console.error('Get leaderboard error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ══════════════════════════════════════
   WEAK AREAS  (authenticated)
══════════════════════════════════════ */
router.get('/weak-areas', authenticateToken, async (req, res) => {
  try {
    const results = await ExamResult.find({ userId: req.user.userId }).select(
      'answers',
    )

    const stats = {}
    for (const result of results) {
      for (const a of result.answers) {
        if (!stats[a.questionId]) {
          stats[a.questionId] = {
            question: a.question,
            correctAnswers: a.correctAnswers,
            options: [],
            topic: a.topic || null,
            wrong: 0,
            total: 0,
          }
        }
        stats[a.questionId].total++
        if (!a.isCorrect) stats[a.questionId].wrong++
      }
    }

    const weakAreas = Object.entries(stats)
      .filter(([, s]) => s.total >= 2 && s.wrong / s.total > 0.4)
      .map(([id, s]) => ({
        questionId: id,
        question: s.question,
        correctAnswers: s.correctAnswers,
        options: s.options,
        topic: s.topic,
        timesAttempted: s.total,
        userAccuracy: parseFloat((1 - s.wrong / s.total).toFixed(2)),
      }))
      .sort((a, b) => a.userAccuracy - b.userAccuracy)
      .slice(0, 30)

    res.json({ weakAreas })
  } catch (err) {
    console.error('Weak areas error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
