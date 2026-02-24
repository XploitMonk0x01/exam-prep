// Question types
export interface Question {
  id: string
  question: string
  options: string[]
  correctAnswers: string[]
  type: 'single' | 'multi'
  explanation?: string
  topic?: string // category tag for grouping
}

export interface Exam {
  id?: string
  title: string
  subject?: string
  questions: Question[]
  timeLimit?: number // in seconds
  shareId?: string // set when loaded from a shared link
}

// User answer tracking
export interface UserAnswer {
  questionId: string
  selectedAnswers: string[]
  timeSpent?: number // seconds spent on this question
  flagged?: boolean // user marked for review
}

// Exam result
export interface ExamResult {
  examId?: string
  title: string
  subject?: string
  score: number
  total: number
  percentage: number
  timeTaken: number
  date: Date
  answers: {
    questionId: string
    question: string
    selectedAnswers: string[]
    correctAnswers: string[]
    isCorrect: boolean
    timeSpent?: number
    flagged?: boolean
    topic?: string
  }[]
}

// Saved exam (bank)
export interface SavedExam {
  _id: string
  title: string
  subject?: string
  questions: Question[]
  timeLimit?: number
  shareId?: string
  isPublic: boolean
  createdAt: string
}

// Leaderboard (shared exams)
export interface LeaderboardEntry {
  nickname: string
  score: number
  total: number
  percentage: number
  timeTaken: number
  submittedAt: string
}

// Weak area question
export interface WeakArea {
  id: string
  question: string
  options: string[]
  correctAnswers: string[]
  wrong: number
  total: number
  accuracy: number
  topic?: string
}

// User types
export interface User {
  id: string
  email: string
  name?: string
  examHistory?: ExamResult[]
  currentStreak?: number
  longestStreak?: number
  lastExamDate?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  setUser: (user: User, token: string) => void
}
