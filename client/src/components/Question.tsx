import type { Question as QuestionType } from '../types'

interface QuestionProps {
  question: QuestionType
  questionNumber: number
  selectedAnswers: string[]
  onAnswerChange: (answers: string[]) => void
  showResults?: boolean
}

export default function Question({
  question,
  questionNumber,
  selectedAnswers,
  onAnswerChange,
  showResults = false,
}: QuestionProps) {
  const handleSingleSelect = (option: string) => {
    if (!showResults) {
      onAnswerChange([option])
    }
  }

  const handleMultiSelect = (option: string) => {
    if (!showResults) {
      const newAnswers = selectedAnswers.includes(option)
        ? selectedAnswers.filter((a) => a !== option)
        : [...selectedAnswers, option]
      onAnswerChange(newAnswers)
    }
  }

  const isCorrectAnswer = (option: string) => {
    return question.correctAnswers.includes(option)
  }

  const isSelected = (option: string) => {
    return selectedAnswers.includes(option)
  }

  const getOptionStyle = (option: string) => {
    if (!showResults) {
      // Before submission
      if (isSelected(option)) {
        return 'bg-indigo-50 dark:bg-indigo-950 border-indigo-600 dark:border-indigo-500'
      }
      return 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    } else {
      // After submission
      if (isCorrectAnswer(option)) {
        return 'bg-green-50 dark:bg-green-950 border-green-600 dark:border-green-500'
      }
      if (isSelected(option) && !isCorrectAnswer(option)) {
        return 'bg-red-50 dark:bg-red-950 border-red-600 dark:border-red-500'
      }
      return 'border-gray-200 dark:border-gray-700 opacity-60'
    }
  }

  return (
    <div className="space-y-6">
      {/* Question text */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Q{questionNumber}
          </span>
          <p className="text-xl font-medium text-gray-900 dark:text-gray-100 flex-1">
            {question.question}
          </p>
        </div>
        {question.type === 'multi' && !showResults && (
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-9">
            Select all that apply
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3 ml-9">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() =>
              question.type === 'single'
                ? handleSingleSelect(option)
                : handleMultiSelect(option)
            }
            disabled={showResults}
            className={`w-full text-left p-4 rounded-md border-2 transition-all duration-200 ${getOptionStyle(
              option,
            )} ${!showResults ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-3">
              {/* Custom checkbox/radio */}
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-${
                  question.type === 'single' ? 'full' : 'sm'
                } border-2 flex items-center justify-center ${
                  isSelected(option)
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {isSelected(option) && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {question.type === 'single' ? (
                      <circle cx="12" cy="12" r="5" fill="currentColor" />
                    ) : (
                      <path d="M5 13l4 4L19 7"></path>
                    )}
                  </svg>
                )}
              </div>

              {/* Option text */}
              <span className="text-base text-gray-900 dark:text-gray-100">
                {option}
              </span>

              {/* Correct/Incorrect indicator */}
              {showResults &&
                (isCorrectAnswer(option) ||
                  (isSelected(option) && !isCorrectAnswer(option))) && (
                  <span className="ml-auto text-sm font-medium">
                    {isCorrectAnswer(option) ? (
                      <span className="text-green-600 dark:text-green-500">
                        ✓ Correct
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-500">
                        ✗ Wrong
                      </span>
                    )}
                  </span>
                )}
            </div>
          </button>
        ))}
      </div>

      {/* Explanation (only shown after submission) */}
      {showResults && question.explanation && (
        <div className="ml-9 p-4 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Explanation:
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}
