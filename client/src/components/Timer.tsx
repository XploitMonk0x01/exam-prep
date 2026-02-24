import { useState, useEffect, useRef } from 'react'

interface TimerProps {
  initialTime: number // in seconds
  onTimeUp: () => void
  isRunning: boolean
}

export default function Timer({
  initialTime,
  onTimeUp,
  isRunning,
}: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, onTimeUp])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const percentage = (timeRemaining / initialTime) * 100
  const isWarning = percentage < 20

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <svg
          className={`w-5 h-5 ${isWarning ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span
          className={`font-mono text-lg font-medium ${
            isWarning
              ? 'text-red-600 dark:text-red-500'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {formatTime(timeRemaining)}
        </span>
      </div>
      {isWarning && (
        <span className="text-xs text-red-600 dark:text-red-500 font-medium">
          Time running out!
        </span>
      )}
    </div>
  )
}
