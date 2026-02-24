import { useEffect, useState } from 'react'
import type { Exam, Question, SavedExam } from '../types'
import { useAuthStore } from '../store/authStore'
import { bankAPI } from '../utils/api'

interface ExamSetupProps {
  onStart: (exam: Exam) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SAMPLE_JSON = JSON.stringify(
  [
    {
      question: 'What does HTML stand for?',
      options: [
        'HyperText Markup Language',
        'High Tech Machine Language',
        'HyperText Machine Language',
        'HyperText Makeup Language',
      ],
      correctAnswer: 'HyperText Markup Language',
      explanation: 'HTML is the standard language for building web pages.',
      topic: 'Web Basics',
    },
    {
      question: 'Which are JavaScript primitive types? (select all)',
      options: ['string', 'Object', 'boolean', 'Array'],
      correctAnswers: ['string', 'boolean'],
      explanation: 'Object and Array are reference types, not primitives.',
      topic: 'JavaScript',
    },
    {
      question: 'Which CSS property controls text boldness?',
      options: ['font-weight', 'text-size', 'font-style', 'text-weight'],
      correctAnswer: 'font-weight',
      topic: 'CSS',
    },
    {
      question: 'What does the "C" in CSS stand for?',
      options: ['Cascading', 'Controlled', 'Computer', 'Creative'],
      correctAnswer: 'Cascading',
      topic: 'CSS',
    },
    {
      question: 'Which HTTP methods are idempotent? (select all)',
      options: ['GET', 'POST', 'PUT', 'DELETE'],
      correctAnswers: ['GET', 'PUT', 'DELETE'],
      explanation:
        'POST is not idempotent — calling it multiple times creates duplicates.',
      topic: 'HTTP',
    },
  ],
  null,
  2,
)

export default function ExamSetup({ onStart }: ExamSetupProps) {
  const { isAuthenticated } = useAuthStore()

  // Form fields
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [timeLimit, setTimeLimit] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  // State
  const [error, setError] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState<Question[] | null>(
    null,
  )
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Bank
  const [bankExams, setBankExams] = useState<SavedExam[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [showBank, setShowBank] = useState(false)

  // Load bank exams when authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    setBankLoading(true)
    bankAPI
      .getExams()
      .then((d) => setBankExams(d.exams || []))
      .catch(() => {})
      .finally(() => setBankLoading(false))
  }, [isAuthenticated])

  /* ── parse JSON into Question[] ── */
  const parseQuestions = (raw: string): Question[] => {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed))
      throw new Error('Questions must be a JSON array')

    return parsed.map((q, i) => {
      if (!q.question || !q.options || !Array.isArray(q.options))
        throw new Error(`Invalid question at index ${i}`)

      const correctAnswers = Array.isArray(q.correctAnswers)
        ? q.correctAnswers
        : q.correctAnswer
          ? [q.correctAnswer]
          : []

      if (correctAnswers.length === 0)
        throw new Error(`No correct answer for question ${i + 1}`)

      return {
        id: q.id || `q_${i + 1}`,
        question: q.question,
        options: q.options as string[],
        correctAnswers,
        type: (correctAnswers.length > 1 ? 'multi' : 'single') as
          | 'single'
          | 'multi',
        explanation: q.explanation,
        topic: q.topic,
      }
    })
  }

  /* ── Preview parsed questions ── */
  const handlePreview = () => {
    setError('')
    if (!jsonInput.trim()) {
      setError('Paste your questions JSON first')
      return
    }
    try {
      const qs = parseQuestions(jsonInput)
      setParsedQuestions(qs)
      setShowPreview(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  const deleteQuestion = (id: string) => {
    setParsedQuestions((prev) => prev?.filter((q) => q.id !== id) ?? null)
  }

  /* ── Load from bank ── */
  const loadFromBank = (exam: SavedExam) => {
    setTitle(exam.title)
    setSubject(exam.subject || '')
    setTimeLimit(exam.timeLimit ? Math.round(exam.timeLimit / 60) : 0)
    setJsonInput(
      JSON.stringify(
        exam.questions.map((q) => ({
          question: q.question,
          options: q.options,
          ...(q.type === 'multi'
            ? { correctAnswers: q.correctAnswers }
            : { correctAnswer: q.correctAnswers[0] }),
          ...(q.explanation ? { explanation: q.explanation } : {}),
          ...(q.topic ? { topic: q.topic } : {}),
        })),
        null,
        2,
      ),
    )
    setParsedQuestions(null)
    setShowPreview(false)
    setShowBank(false)
  }

  /* ── Save to bank (authenticated) ── */
  const saveToBank = async () => {
    if (!parsedQuestions) return
    setSaving(true)
    setSavedMsg('')
    try {
      await bankAPI.saveExam({
        title: title || 'Untitled',
        subject,
        questions: parsedQuestions,
        timeLimit: timeLimit > 0 ? timeLimit * 60 : undefined,
      })
      setSavedMsg('Saved to bank!')
      // refresh bank list
      const d = await bankAPI.getExams()
      setBankExams(d.exams || [])
    } catch {
      setSavedMsg('Save failed')
    } finally {
      setSaving(false)
      setTimeout(() => setSavedMsg(''), 3000)
    }
  }

  /* ── Start exam ── */
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please enter an exam title')
      return
    }

    let questions: Question[]
    try {
      questions = parsedQuestions ?? parseQuestions(jsonInput)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON')
      return
    }

    if (questions.length === 0) {
      setError('No valid questions found')
      return
    }

    // Apply shuffle
    let finalQuestions = shuffleQuestions ? shuffle(questions) : questions

    // Apply question count
    const count =
      questionCount > 0
        ? Math.min(questionCount, finalQuestions.length)
        : finalQuestions.length
    if (shuffleQuestions) {
      finalQuestions = finalQuestions.slice(0, count)
    } else if (questionCount > 0) {
      finalQuestions = shuffle(finalQuestions).slice(0, count)
    }

    // Shuffle options per question
    if (shuffleOptions) {
      finalQuestions = finalQuestions.map((q) => {
        const oldCorrect = q.correctAnswers
        const newOptions = shuffle(q.options)
        return { ...q, options: newOptions, correctAnswers: oldCorrect }
      })
    }

    const exam: Exam = {
      title: title.trim(),
      subject: subject.trim() || undefined,
      questions: finalQuestions,
      timeLimit: timeLimit > 0 ? timeLimit * 60 : undefined,
    }
    onStart(exam)
  }

  /* ── Toggle helpers ── */
  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean
    onChange: (v: boolean) => void
    label: string
  }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Create New Exam
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Paste question JSON or load from your saved bank
          </p>
        </div>

        {/* ── Exam Bank Panel ── */}
        {isAuthenticated && (
          <div className="mb-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowBank((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <span>📂 Saved Exam Bank ({bankExams.length})</span>
              <span
                className={`transition-transform ${showBank ? 'rotate-180' : ''}`}
              >
                ▾
              </span>
            </button>
            {showBank && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3">
                {bankLoading ? (
                  <p className="text-sm text-gray-500 py-2">Loading…</p>
                ) : bankExams.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No saved exams yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {bankExams.map((exam) => (
                      <div
                        key={exam._id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {exam.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {exam.questions.length} questions
                            {exam.subject ? ` · ${exam.subject}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => loadFromBank(exam)}
                          className="text-xs px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleStart} className="space-y-5">
          {/* ── Metadata ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., JavaScript Fundamentals"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Programming"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Limit (min, 0 = none)
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) =>
                    setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* ── Options: shuffle + question count ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Options
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Toggle
                checked={shuffleQuestions}
                onChange={setShuffleQuestions}
                label="Shuffle questions"
              />
              <Toggle
                checked={shuffleOptions}
                onChange={setShuffleOptions}
                label="Shuffle options"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Questions to take
                </label>
                <input
                  type="number"
                  value={questionCount || ''}
                  onChange={(e) =>
                    setQuestionCount(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  placeholder="All"
                  min="0"
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ── JSON Input ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Questions JSON *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJsonInput(SAMPLE_JSON)
                    setParsedQuestions(null)
                    setShowPreview(false)
                  }}
                  className="text-xs px-3 py-1 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  Load sample
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Preview & edit
                </button>
              </div>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value)
                setParsedQuestions(null)
                setShowPreview(false)
              }}
              placeholder={`[\n  {\n    "question": "What is React?",\n    "options": ["A library", "A framework", "A language"],\n    "correctAnswer": "A library",\n    "topic": "React"\n  }\n]`}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-y"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Fields: <code>question</code>, <code>options[]</code>,{' '}
              <code>correctAnswer</code> or <code>correctAnswers[]</code>,
              optional: <code>explanation</code>, <code>topic</code>
            </p>
          </div>

          {/* ── Question Preview & Edit ── */}
          {showPreview && parsedQuestions && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {parsedQuestions.length} question
                  {parsedQuestions.length !== 1 ? 's' : ''} parsed
                  {questionCount > 0 &&
                    questionCount < parsedQuestions.length && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                        · {questionCount} will be used
                      </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={saveToBank}
                      disabled={saving}
                      className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : savedMsg || 'Save to bank'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {parsedQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 group"
                  >
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5 w-6 shrink-0 text-right">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                        {q.question}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {q.type === 'multi' ? 'multi-select' : 'single'}
                        {q.topic ? ` · ${q.topic}` : ''}
                        {' · '}
                        {q.options.length} options
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(q.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm shrink-0"
                      title="Remove question"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md px-4 py-3">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Start Exam
          </button>
        </form>
      </div>
    </div>
  )
}
