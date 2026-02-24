import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Exam, UserAnswer } from '../types'
import { weakAreaAPI } from '../utils/api'
import ExamInterface from './ExamInterface'
import ExamResults from './ExamResults'

interface WeakAreaQuestion {
  questionId: string
  question: string
  options: string[]
  correctAnswers: string[]
  topic?: string
  userAccuracy: number
  timesAttempted: number
}

type Phase = 'loading' | 'empty' | 'drill' | 'results'

export default function WeakAreaDrill() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [exam, setExam] = useState<Exam | null>(null)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [timeTaken, setTimeTaken] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false
    weakAreaAPI
      .getWeakAreas()
      .then((data) => {
        if (cancelled) return
        const questions: WeakAreaQuestion[] = data.weakAreas || []
        if (questions.length === 0) {
          setPhase('empty')
          return
        }
        const drillExam: Exam = {
          title: 'Weak Area Drill',
          subject: 'Practice',
          timeLimit: undefined,
          questions: questions.map((q) => ({
            id: q.questionId,
            question: q.question,
            options: q.options,
            correctAnswers: q.correctAnswers,
            type:
              q.correctAnswers.length > 1
                ? ('multi' as const)
                : ('single' as const),
            topic: q.topic,
          })),
        }
        setExam(drillExam)
        setPhase('drill')
      })
      .catch(() => {
        if (cancelled) return
        setError(
          'Failed to load weak areas. Make sure you have attempted some exams first.',
        )
        setPhase('empty')
      })
    return () => {
      cancelled = true
    }
  }, [fetchTrigger])

  const retryLoad = () => {
    setPhase('loading')
    setError('')
    setFetchTrigger((n) => n + 1)
  }

  const handleSubmit = (answers: UserAnswer[], time: number) => {
    setUserAnswers(answers)
    setTimeTaken(time)
    setPhase('results')
  }

  /* ── Loading ── */
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Loading weak areas…
          </p>
        </div>
      </div>
    )
  }

  /* ── Empty / Error ── */
  if (phase === 'empty') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">📊</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            No weak areas yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {error ||
              'Complete a few exams first. Questions you get wrong will appear here for targeted practice.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              Go to Dashboard
            </button>
            {error && (
              <button
                onClick={retryLoad}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Drill ── */
  if (phase === 'drill' && exam) {
    return (
      <ExamInterface
        exam={exam}
        onSubmit={handleSubmit}
        onQuit={() => navigate('/dashboard')}
      />
    )
  }

  /* ── Results ── */
  if (phase === 'results' && exam) {
    return (
      <ExamResults
        exam={exam}
        userAnswers={userAnswers}
        timeTaken={timeTaken}
        onRetake={() => {
          setUserAnswers([])
          setTimeTaken(0)
          retryLoad()
        }}
        onNewExam={() => navigate('/dashboard')}
      />
    )
  }

  return null
}
