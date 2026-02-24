import { useEffect, useRef, useState } from 'react'
import type { Exam, UserAnswer } from '../types'
import { useAuthStore } from '../store/authStore'
import { examAPI } from '../utils/api'
import Question from './Question'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartOptions, TooltipItem } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
)

interface ExamResultsProps {
  exam: Exam
  userAnswers: UserAnswer[]
  timeTaken: number
  onRetake?: () => void
  onNewExam?: () => void
}

type ViewMode = 'summary' | 'review'

/* ─────────────── helpers ─────────────── */
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function scoreColor(pct: number) {
  if (pct >= 75)
    return { text: 'text-green-600 dark:text-green-400', ring: '#22c55e' }
  if (pct >= 50)
    return { text: 'text-yellow-600 dark:text-yellow-400', ring: '#eab308' }
  return { text: 'text-red-600 dark:text-red-400', ring: '#ef4444' }
}

function perfLabel(pct: number) {
  if (pct >= 90) return 'Excellent!'
  if (pct >= 75) return 'Great job!'
  if (pct >= 60) return 'Good effort!'
  if (pct >= 50) return 'Not bad!'
  return 'Keep practicing!'
}

/* ─────────────────────────────────────── */

export default function ExamResults({
  exam,
  userAnswers,
  timeTaken,
  onRetake,
  onNewExam,
}: ExamResultsProps) {
  const { isAuthenticated } = useAuthStore()
  const [view, setView] = useState<ViewMode>('summary')
  // initialise to true when authenticated so the 'Saving…' badge shows immediately
  const [saving, setSaving] = useState(isAuthenticated)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const hasSaved = useRef(false)

  /* ── calculate results ── */
  const results = exam.questions.map((q) => {
    const ua = userAnswers.find((a) => a.questionId === q.id)
    const selected = ua?.selectedAnswers ?? []
    const correct = q.correctAnswers
    const isCorrect =
      selected.length === correct.length &&
      selected.every((a) => correct.includes(a)) &&
      correct.every((a) => selected.includes(a))
    return { question: q, selectedAnswers: selected, isCorrect }
  })

  const score = results.filter((r) => r.isCorrect).length
  const total = exam.questions.length
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0
  const { text: scoreTextColor, ring: ringColor } = scoreColor(percentage)

  /* ── auto-save to backend when authenticated ── */
  useEffect(() => {
    if (!isAuthenticated || hasSaved.current) return
    hasSaved.current = true
    const payload = {
      title: exam.title,
      subject: exam.subject,
      timeTaken,
      answers: results.map((r) => ({
        questionId: r.question.id,
        question: r.question.question,
        selectedAnswers: r.selectedAnswers,
        correctAnswers: r.question.correctAnswers,
        isCorrect: r.isCorrect,
      })),
    }
    examAPI
      .submitExam(payload)
      .then(() => setSaved(true))
      .catch(() => setSaveError('Could not save'))
      .finally(() => setSaving(false))
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Doughnut chart ── */
  const doughnutData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [score, total - score],
        backgroundColor: [ringColor, 'rgba(156,163,175,0.25)'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }
  const doughnutOptions = {
    responsive: true,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c: TooltipItem<'doughnut'>) => ` ${c.label}: ${c.raw}`,
        },
      },
    },
  }

  /* ── Bar chart: per-question ── */
  const barData = {
    labels: results.map((_, i) => `Q${i + 1}`),
    datasets: [
      {
        label: 'Result',
        data: results.map(() => 1),
        backgroundColor: results.map((r) =>
          r.isCorrect ? 'rgba(99,102,241,0.85)' : 'rgba(239,68,68,0.6)',
        ),
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  }
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { display: false },
      x: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  }

  /* ── topic breakdown ── */
  const topicMap = new Map<string, { correct: number; total: number }>()
  results.forEach((r) => {
    const key = r.question.topic ?? 'General'
    const entry = topicMap.get(key) ?? { correct: 0, total: 0 }
    topicMap.set(key, {
      correct: entry.correct + (r.isCorrect ? 1 : 0),
      total: entry.total + 1,
    })
  })
  const topicBreakdown = [...topicMap.entries()]
    .map(([topic, data]) => ({
      topic,
      ...data,
      pct: Math.round((data.correct / data.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct)

  /* ── time heatmap (for review) ── */
  const uaMap = new Map(userAnswers.map((ua) => [ua.questionId, ua]))
  const avgTime =
    userAnswers
      .filter((ua) => (ua.timeSpent ?? 0) > 0)
      .reduce((s, ua) => s + (ua.timeSpent ?? 0), 0) /
    Math.max(1, userAnswers.filter((ua) => (ua.timeSpent ?? 0) > 0).length)

  /* ─────── render ─────── */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      {/* ── Top bar ── */}
      <div className="no-print bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {exam.title}
            </p>
            {exam.subject && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {exam.subject}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  saving
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    : saved
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      : saveError
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                        : ''
                }`}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : saveError}
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="no-print text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Print / Export PDF"
            >
              🖨 Print
            </button>
            <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
              {(['summary', 'review'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 capitalize font-medium transition-colors duration-150 ${
                    view === v
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 space-y-6">
        {/* ══ SUMMARY ══ */}
        {view === 'summary' && (
          <>
            {/* Score card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Doughnut */}
                <div className="relative w-36 h-36 shrink-0">
                  <Doughnut
                    data={doughnutData}
                    options={doughnutOptions as ChartOptions<'doughnut'>}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className={`text-2xl font-bold ${scoreTextColor}`}>
                      {percentage}%
                    </span>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex-1 text-center md:text-left">
                  <p className={`text-xl font-semibold ${scoreTextColor} mb-1`}>
                    {perfLabel(percentage)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {score}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {total}
                    </span>{' '}
                    questions correct
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Score', value: `${score}/${total}` },
                      { label: 'Time taken', value: formatTime(timeTaken) },
                      {
                        label: 'Avg / question',
                        value: `${total > 0 ? Math.round(timeTaken / total) : 0}s`,
                      },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {s.value}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Per-question bar chart */}
            {total > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Per-question breakdown
                  </h2>
                  <div className="flex items-center gap-3 ml-auto text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block bg-indigo-500" />
                      Correct
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block bg-red-400" />
                      Incorrect
                    </span>
                  </div>
                </div>
                <div className="h-28">
                  <Bar
                    data={barData}
                    options={barOptions as ChartOptions<'bar'>}
                  />
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Correct',
                  value: score,
                  color: 'text-green-600 dark:text-green-400',
                },
                {
                  label: 'Incorrect',
                  value: total - score,
                  color: 'text-red-600 dark:text-red-400',
                },
                {
                  label: 'Accuracy',
                  value: `${percentage}%`,
                  color: scoreTextColor,
                },
                {
                  label: 'Questions',
                  value: total,
                  color: 'text-gray-900 dark:text-gray-100',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-5 py-4"
                >
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Topic breakdown */}
            {topicBreakdown.length >= 2 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  By topic
                </h2>
                <div className="space-y-3">
                  {topicBreakdown.map(({ topic, correct, total: t, pct }) => (
                    <div key={topic} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {topic}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {correct}/{t} &middot; {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 75
                              ? 'bg-indigo-500'
                              : pct >= 50
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unanswered warning */}
            {results.filter((r) => r.selectedAnswers.length === 0).length >
              0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md px-5 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                ⚠ {results.filter((r) => r.selectedAnswers.length === 0).length}{' '}
                question(s) left unanswered
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {onRetake && (
                <button
                  onClick={onRetake}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Retake exam
                </button>
              )}
              <button
                onClick={() => setView('review')}
                className="flex-1 py-3 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-200"
              >
                Review answers
              </button>
              {onNewExam && (
                <button
                  onClick={onNewExam}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  New exam
                </button>
              )}
            </div>
          </>
        )}

        {/* ══ REVIEW ══ */}
        {view === 'review' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {score}/{total}
                </span>{' '}
                correct · {percentage}%
              </span>
              <button
                onClick={() => setView('summary')}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                ← Back to summary
              </button>
            </div>

            <div className="space-y-5">
              {results.map((r, i) => (
                <div
                  key={r.question.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-7"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        r.isCorrect
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {r.isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Question {i + 1} · {r.isCorrect ? 'Correct' : 'Incorrect'}
                      {r.selectedAnswers.length === 0 && ' · Unanswered'}
                    </span>{' '}
                    {/* Time heatmap badge */}
                    {(() => {
                      const ua = uaMap.get(r.question.id)
                      const t = ua?.timeSpent ?? 0
                      if (!t || avgTime === 0) return null
                      const ratio = t / avgTime
                      const label = `${t}s`
                      const cls =
                        ratio > 2
                          ? 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400'
                          : ratio < 0.5
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      return (
                        <span
                          className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}
                        >
                          ⏱ {label}
                        </span>
                      )
                    })()}{' '}
                  </div>
                  <Question
                    question={r.question}
                    questionNumber={i + 1}
                    selectedAnswers={r.selectedAnswers}
                    onAnswerChange={() => {}}
                    showResults={true}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              {onRetake && (
                <button
                  onClick={onRetake}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Retake exam
                </button>
              )}
              {onNewExam && (
                <button
                  onClick={onNewExam}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  New exam
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
