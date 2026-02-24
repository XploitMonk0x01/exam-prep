import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Exam, UserAnswer } from '../types'
import { sharedAPI } from '../utils/api'
import ExamInterface from './ExamInterface'

interface LeaderboardEntry {
  nickname: string
  score: number
  total: number
  percentage: number
  timeTaken: number
  submittedAt: string
}

type Phase =
  | 'loading'
  | 'intro'
  | 'taking'
  | 'nickname'
  | 'leaderboard'
  | 'error'

export default function SharedExam() {
  const { shareId } = useParams<{ shareId: string }>()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [exam, setExam] = useState<Exam | null>(null)
  const [examMeta, setExamMeta] = useState<{
    title: string
    subject?: string
    questionCount: number
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // After taking
  const [score, setScore] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)

  // Nickname phase
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nickError, setNickError] = useState('')

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)

  const loadExam = useCallback(async () => {
    setPhase('loading')
    try {
      const data = await sharedAPI.getExam(shareId!)
      const raw = data.exam
      const built: Exam = {
        title: raw.title,
        subject: raw.subject,
        timeLimit: raw.timeLimit,
        questions: raw.questions,
      }
      setExam(built)
      setExamMeta({
        title: raw.title,
        subject: raw.subject,
        questionCount: raw.questions.length,
      })
      setPhase('intro')
    } catch {
      setErrorMsg('This shared exam link is invalid or has expired.')
      setPhase('error')
    }
  }, [shareId])

  useEffect(() => {
    if (!shareId) {
      setErrorMsg('Invalid link')
      setPhase('error')
      return
    }
    loadExam()
  }, [shareId, loadExam])

  const handleStartExam = () => {
    setPhase('taking')
  }

  const handleExamSubmit = (answers: UserAnswer[], elapsed: number) => {
    // compute score from answers + exam questions
    const finalScore =
      exam?.questions.reduce((acc, q) => {
        const ua = answers.find((a) => a.questionId === q.id)
        if (!ua) return acc
        const correct =
          ua.selectedAnswers.length === q.correctAnswers.length &&
          ua.selectedAnswers.every((s) => q.correctAnswers.includes(s))
        return correct ? acc + 1 : acc
      }, 0) ?? 0
    setScore(finalScore)
    setTimeTaken(elapsed)
    setPhase('nickname')
  }

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setNickError('Please enter a nickname')
      return
    }
    setSubmitting(true)
    setNickError('')

    try {
      const total = exam!.questions.length
      const percentage = Math.round((score / total) * 100)
      await sharedAPI.submitScore(shareId!, {
        nickname: nickname.trim(),
        score,
        total,
        percentage,
        timeTaken,
      })

      const data = await sharedAPI.getLeaderboard(shareId!)
      const entries: LeaderboardEntry[] = data.leaderboard || []
      setLeaderboard(entries)

      // find own rank
      const sortedIdx = [...entries]
        .sort(
          (a, b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken,
        )
        .findIndex((e) => e.nickname === nickname.trim() && e.score === score)
      setMyRank(sortedIdx >= 0 ? sortedIdx + 1 : null)

      setPhase('leaderboard')
    } catch {
      setNickError('Failed to submit score. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  /* ── Loading ── */
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Loading shared exam…
          </p>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🔗</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Exam not found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">{errorMsg}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  /* ── Intro ── */
  if (phase === 'intro' && examMeta) {
    const hasLeaderboard = true
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 space-y-4">
            <div className="text-4xl">📋</div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {examMeta.title}
              </h1>
              {examMeta.subject && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {examMeta.subject}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {examMeta.questionCount}
                </p>
                <p>questions</p>
              </div>
              {exam?.timeLimit && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(exam.timeLimit / 60)}
                  </p>
                  <p>minutes</p>
                </div>
              )}
              {hasLeaderboard && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    🏆
                  </p>
                  <p>leaderboard</p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              After completing, your score will be added to the leaderboard.
              Enter a nickname to appear on the board.
            </p>

            <button
              onClick={handleStartExam}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Start Exam
            </button>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Take me home
          </button>
        </div>
      </div>
    )
  }

  /* ── Taking ── */
  if (phase === 'taking' && exam) {
    return (
      <ExamInterface
        exam={exam}
        onSubmit={handleExamSubmit}
        onQuit={() => setPhase('intro')}
      />
    )
  }

  /* ── Nickname ── */
  if (phase === 'nickname') {
    const total = exam?.questions.length ?? 1
    const pct = Math.round((score / total) * 100)

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          {/* Score summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">
              {pct}%
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {score} / {total} correct · {formatTime(timeTaken)}
            </p>
          </div>

          {/* Nickname form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add your name to the leaderboard
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Pick a nickname to show publicly on the scoreboard.
              </p>
            </div>

            <form onSubmit={handleSubmitScore} className="space-y-3">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                maxLength={30}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                autoFocus
              />
              {nickError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {nickError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit & See Leaderboard'}
              </button>
            </form>

            <button
              onClick={async () => {
                const data = await sharedAPI.getLeaderboard(shareId!)
                setLeaderboard(data.leaderboard || [])
                setMyRank(null)
                setPhase('leaderboard')
              }}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
            >
              Skip — just view leaderboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Leaderboard ── */
  if (phase === 'leaderboard') {
    const sorted = [...leaderboard].sort(
      (a, b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken,
    )

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
              Leaderboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {examMeta?.title}
            </p>
          </div>

          {myRank && (
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg px-5 py-3 text-center">
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Your rank: #{myRank} of {sorted.length}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {sorted.length === 0 ? (
              <p className="text-center text-gray-500 py-10 text-sm">
                No scores yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry, i) => {
                    const isMe = myRank !== null && i + 1 === myRank
                    return (
                      <tr
                        key={`${entry.nickname}-${i}`}
                        className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                          isMe
                            ? 'bg-indigo-50 dark:bg-indigo-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">
                          {i === 0
                            ? '🥇'
                            : i === 1
                              ? '🥈'
                              : i === 2
                                ? '🥉'
                                : `${i + 1}`}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                          {entry.nickname}
                          {isMe && (
                            <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">
                              (you)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">
                            {entry.percentage}%
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 ml-1.5 text-xs">
                            {entry.score}/{entry.total}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                          {formatTime(entry.timeTaken)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setPhase('intro')}
              className="px-5 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              Retake Exam
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
