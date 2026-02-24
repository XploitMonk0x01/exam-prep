import { useCallback, useEffect, useRef, useState } from 'react'
import type { Exam, UserAnswer } from '../types'
import Question from './Question'
import Timer from './Timer'

interface ExamInterfaceProps {
  exam: Exam
  onSubmit: (answers: UserAnswer[], timeTaken: number) => void
  onQuit: () => void
}

export default function ExamInterface({
  exam,
  onSubmit,
  onQuit,
}: ExamInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map())
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [questionTimes, setQuestionTimes] = useState<Map<string, number>>(
    new Map(),
  )
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showGrid, setShowGrid] = useState(false)

  const startTimeRef = useRef<number>(0)
  const questionStartRef = useRef<number>(0)

  // initialise refs after mount (avoids calling impure Date.now during render)
  useEffect(() => {
    startTimeRef.current = Date.now()
    questionStartRef.current = Date.now()
  }, [])

  const total = exam.questions.length
  const question = exam.questions[currentIndex]

  /* ── per-question time tracking ── */
  const flushCurrentTime = useCallback(() => {
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
    const qId = exam.questions[currentIndex].id
    if (elapsed > 0) {
      setQuestionTimes((prev) => {
        const next = new Map(prev)
        next.set(qId, (prev.get(qId) || 0) + elapsed)
        return next
      })
    }
    questionStartRef.current = Date.now()
  }, [currentIndex, exam.questions])

  const goTo = useCallback(
    (idx: number) => {
      flushCurrentTime()
      setCurrentIndex(idx)
      setShowGrid(false)
    },
    [flushCurrentTime],
  )

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) goTo(currentIndex + 1)
  }, [currentIndex, total, goTo])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  const toggleFlag = useCallback(
    (id?: string) => {
      const target = id ?? exam.questions[currentIndex].id
      setFlagged((prev) => {
        const s = new Set(prev)
        if (s.has(target)) { s.delete(target) } else { s.add(target) }
        return s
      })
    },
    [currentIndex, exam.questions],
  )

  const handleAnswerChange = useCallback(
    (selected: string[]) => {
      setAnswers((prev) => {
        const m = new Map(prev)
        m.set(question.id, selected)
        return m
      })
    },
    [question.id],
  )

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (showSubmitConfirm || showQuitConfirm) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          handleNext()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          handlePrev()
          break
        case 'f':
        case 'F':
          toggleFlag()
          break
        case 'g':
        case 'G':
          setShowGrid((v) => !v)
          break
        case 'Escape':
          setShowGrid(false)
          setShowSubmitConfirm(false)
          break
        case 'Enter':
          if (currentIndex === total - 1) setShowSubmitConfirm(true)
          else handleNext()
          break
        default: {
          const n = parseInt(e.key)
          if (!isNaN(n) && n >= 1 && n <= question.options.length) {
            e.preventDefault()
            const opt = question.options[n - 1]
            const cur = answers.get(question.id) || []
            if (question.type === 'single') {
              handleAnswerChange([opt])
            } else {
              handleAnswerChange(
                cur.includes(opt)
                  ? cur.filter((o) => o !== opt)
                  : [...cur, opt],
              )
            }
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    handleNext,
    handlePrev,
    toggleFlag,
    showSubmitConfirm,
    showQuitConfirm,
    currentIndex,
    total,
    question,
    answers,
    handleAnswerChange,
  ])

  /* ── submit ── */
  const handleSubmit = useCallback(() => {
    flushCurrentTime()
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const answersArr: UserAnswer[] = exam.questions.map((q) => ({
      questionId: q.id,
      selectedAnswers: answers.get(q.id) || [],
      timeSpent: questionTimes.get(q.id) || 0,
      flagged: flagged.has(q.id),
    }))
    onSubmit(answersArr, timeTaken)
  }, [
    flushCurrentTime,
    exam.questions,
    answers,
    questionTimes,
    flagged,
    onSubmit,
  ])

  /* ── derived values ── */
  const answeredCount = exam.questions.filter(
    (q) => (answers.get(q.id) || []).length > 0,
  ).length
  const flaggedCount = flagged.size
  const progress = ((currentIndex + 1) / total) * 100
  const isFlagged = flagged.has(question.id)

  /* ── grid cell status ── */
  const questionStatus = (q: (typeof exam.questions)[0], i: number) => {
    const answered = (answers.get(q.id) || []).length > 0
    const isFlag = flagged.has(q.id)
    if (i === currentIndex) return 'current'
    if (isFlag && answered) return 'flagged-answered'
    if (isFlag) return 'flagged'
    if (answered) return 'answered'
    return 'unanswered'
  }

  const statusClass = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-500'
      case 'answered':
        return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
      case 'flagged':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-400'
      case 'flagged-answered':
        return 'bg-yellow-200 dark:bg-yellow-800/60 text-yellow-800 dark:text-yellow-200 ring-1 ring-yellow-500'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {exam.title}
              </h1>
              {exam.subject && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {exam.subject}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {exam.timeLimit && (
                <Timer
                  initialTime={exam.timeLimit}
                  onTimeUp={handleSubmit}
                  isRunning
                />
              )}
              <button
                onClick={() => setShowGrid((v) => !v)}
                title="Question grid (G)"
                className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors duration-150 ${
                  showGrid
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                Quit
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Q {currentIndex + 1} / {total}
              </span>
              <span className="flex items-center gap-3">
                {flaggedCount > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ⚑ {flaggedCount} flagged
                  </span>
                )}
                <span>
                  {answeredCount}/{total} answered
                </span>
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Question Grid Modal ── */}
      {showGrid && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowGrid(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                All Questions
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-indigo-100 dark:bg-indigo-900/50 inline-block" />
                  Answered
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-yellow-100 dark:bg-yellow-900/50 inline-block" />
                  Flagged
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700 inline-block" />
                  Pending
                </span>
              </div>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {exam.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => goTo(i)}
                  className={`h-9 rounded-md text-xs font-semibold transition-all duration-100 hover:scale-105 ${statusClass(questionStatus(q, i))}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              ← → navigate · F flag · G toggle grid · 1–
              {Math.min(question.options.length, 9)} select option
            </p>
          </div>
        </div>
      )}

      {/* ── Question area ── */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
              {question.topic ? `Topic: ${question.topic}` : ''}
            </span>
            <button
              onClick={() => toggleFlag()}
              title="Flag for review (F)"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150 ${
                isFlagged
                  ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-yellow-600 hover:border-yellow-300'
              }`}
            >
              <span>⚑</span>
              <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
            </button>
          </div>
          <Question
            question={question}
            questionNumber={currentIndex + 1}
            selectedAnswers={answers.get(question.id) || []}
            onAnswerChange={handleAnswerChange}
          />
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-5 py-2 text-sm text-gray-700 dark:text-gray-300 font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            Enter to advance · G for grid
          </span>
          {currentIndex === total - 1 ? (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-7 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-7 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* ── Submit confirmation ── */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Submit exam?
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5 space-y-1">
              <p>
                {answeredCount}/{total} questions answered.
              </p>
              {answeredCount < total && (
                <p className="text-orange-600 dark:text-orange-400">
                  ⚠ {total - answeredCount} unanswered — will count as
                  incorrect.
                </p>
              )}
              {flaggedCount > 0 && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  ⚑ {flaggedCount} still flagged for review.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Keep reviewing
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quit confirmation ── */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Quit exam?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Your progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onQuit}
                className="flex-1 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Question grid ── */}
      {showGrid && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowGrid(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Question Navigator
              </h3>
              <button
                onClick={() => setShowGrid(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1.5 mb-4">
              {exam.questions.map((q, i) => {
                const status = questionStatus(q, i)
                return (
                  <button
                    key={q.id}
                    onClick={() => goTo(i)}
                    className={`aspect-square rounded-md text-xs font-semibold transition-colors ${statusClass(status)}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              {[
                { cls: 'bg-indigo-600', label: 'Current' },
                {
                  cls: 'bg-indigo-100 dark:bg-indigo-900/50',
                  label: 'Answered',
                },
                {
                  cls: 'bg-yellow-100 dark:bg-yellow-900/40',
                  label: 'Flagged',
                },
                { cls: 'bg-gray-100 dark:bg-gray-700', label: 'Unanswered' },
              ].map(({ cls, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-sm ${cls}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
