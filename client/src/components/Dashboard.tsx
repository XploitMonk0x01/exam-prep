import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { examAPI, weakAreaAPI, authAPI } from '../utils/api'
import type { ChartOptions, TooltipItem } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  ArcElement,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  ArcElement,
)

interface WeakAreaItem {
  questionId: string
  question: string
  topic?: string
  userAccuracy: number
  timesAttempted: number
}

interface HistoryItem {
  _id: string
  title: string
  subject?: string
  score: number
  total: number
  percentage: number
  timeTaken: number
  createdAt: string
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [streak, setStreak] = useState<{
    current: number
    longest: number
  } | null>(null)
  const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>([])

  useEffect(() => {
    if (!isAuthenticated) return
    examAPI
      .getHistory()
      .then((data) => setHistory(data.history ?? []))
      .catch(() => setError('Could not load history'))
      .finally(() => setLoading(false))

    authAPI
      .getMe()
      .then((data) => {
        if (data.user) {
          setStreak({
            current: data.user.currentStreak ?? 0,
            longest: data.user.longestStreak ?? 0,
          })
        }
      })
      .catch(() => {})

    weakAreaAPI
      .getWeakAreas()
      .then((data) => setWeakAreas((data.weakAreas ?? []).slice(0, 5)))
      .catch(() => {})
  }, [isAuthenticated])

  // Derived stats
  const totalExams = history.length
  const avgScore = totalExams
    ? Math.round(history.reduce((acc, h) => acc + h.percentage, 0) / totalExams)
    : 0
  const totalTime = history.reduce((acc, h) => acc + h.timeTaken, 0)
  const bestScore = totalExams
    ? Math.max(...history.map((h) => h.percentage))
    : 0

  // Chart data: last 10 results (oldest→newest)
  const chartItems = [...history].reverse().slice(-10)
  const chartData = {
    labels: chartItems.map((_, i) => `#${i + 1}`),
    datasets: [
      {
        label: 'Score %',
        data: chartItems.map((h) => h.percentage),
        backgroundColor: chartItems.map((h) =>
          h.percentage >= 75
            ? 'rgba(99,102,241,0.8)'
            : h.percentage >= 50
              ? 'rgba(234,179,8,0.8)'
              : 'rgba(239,68,68,0.8)',
        ),
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  }
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx: TooltipItem<'bar'>) => ` ${ctx.raw}%` },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (v: number | string) => `${v}%`,
          color: '#9ca3af',
          font: { size: 11 },
        },
        grid: { color: 'rgba(156,163,175,0.15)' },
        border: { display: false },
      },
      x: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {user?.name ? `Hello, ${user.name}` : 'Dashboard'}
              </h1>
              {streak && streak.current > 0 && (
                <span className="flex items-center gap-1 text-sm font-medium px-2.5 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-full">
                  🔥 {streak.current} day streak
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Your exam history at a glance
              {streak && streak.longest > 0 && (
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  · best streak: {streak.longest} days
                </span>
              )}
            </p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors duration-150"
          >
            + New Exam
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Exams Taken', value: totalExams },
            { label: 'Avg Score', value: `${avgScore}%` },
            { label: 'Best Score', value: `${bestScore}%` },
            { label: 'Total Time', value: formatTime(totalTime) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-5 py-4"
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Weak areas to practice
              </h2>
              <button
                onClick={() => navigate('/drill')}
                className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors font-medium"
              >
                Practice weak areas →
              </button>
            </div>
            <div className="space-y-2">
              {weakAreas.map((wa, i) => (
                <div
                  key={wa.questionId ?? i}
                  className="flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                      {wa.question}
                    </p>
                    {wa.topic && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {wa.topic}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-400 dark:bg-red-500"
                          style={{
                            width: `${Math.round(wa.userAccuracy * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                        {Math.round(wa.userAccuracy * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        {totalExams > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Score trend (last 10 exams)
            </h2>
            <div className="h-44">
              <Bar
                data={chartData}
                options={chartOptions as ChartOptions<'bar'>}
              />
            </div>
          </div>
        )}

        {/* History list */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              All exams
            </h2>
          </div>

          {loading && (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-10 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && totalExams === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                No exams yet.
              </p>
              <Link
                to="/"
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Take your first exam →
              </Link>
            </div>
          )}

          {!loading && !error && totalExams > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.map((item, i) => {
                const pct = item.percentage
                const color =
                  pct >= 75
                    ? 'text-green-600 dark:text-green-400'
                    : pct >= 50
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                return (
                  <div
                    key={item._id ?? i}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {item.subject && (
                          <span className="mr-2">{item.subject} ·</span>
                        )}
                        {formatDate(item.createdAt)} ·{' '}
                        {formatTime(item.timeTaken)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-semibold ${color}`}>
                        {pct}%
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.score}/{item.total} correct
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
