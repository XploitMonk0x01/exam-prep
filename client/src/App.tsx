import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import type { Exam, UserAnswer } from './types'
import ExamSetup from './components/ExamSetup'
import ExamInterface from './components/ExamInterface'
import ExamResults from './components/ExamResults'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import WeakAreaDrill from './components/WeakAreaDrill'
import SharedExam from './components/SharedExam'

type AppState = 'setup' | 'taking' | 'results'

function App() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [currentExam, setCurrentExam] = useState<Exam | null>(null)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [timeTaken, setTimeTaken] = useState(0)

  const handleStartExam = (exam: Exam) => {
    setCurrentExam(exam)
    setAppState('taking')
  }

  const handleSubmitExam = (answers: UserAnswer[], time: number) => {
    setUserAnswers(answers)
    setTimeTaken(time)
    setAppState('results')
  }

  const handleRetake = () => {
    setUserAnswers([])
    setTimeTaken(0)
    setAppState('taking')
  }

  const handleNewExam = () => {
    setCurrentExam(null)
    setUserAnswers([])
    setTimeTaken(0)
    setAppState('setup')
  }

  const handleQuit = () => {
    setCurrentExam(null)
    setUserAnswers([])
    setTimeTaken(0)
    setAppState('setup')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hide Navbar while actively taking an exam */}
      {appState !== 'taking' && <Navbar />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/drill" element={<WeakAreaDrill />} />
        <Route path="/shared/:shareId" element={<SharedExam />} />
        <Route
          path="/"
          element={
            <>
              {appState === 'setup' && <ExamSetup onStart={handleStartExam} />}

              {appState === 'taking' && currentExam && (
                <ExamInterface
                  exam={currentExam}
                  onSubmit={handleSubmitExam}
                  onQuit={handleQuit}
                />
              )}

              {appState === 'results' && currentExam && (
                <ExamResults
                  exam={currentExam}
                  userAnswers={userAnswers}
                  timeTaken={timeTaken}
                  onRetake={handleRetake}
                  onNewExam={handleNewExam}
                />
              )}
            </>
          }
        />
      </Routes>
    </div>
  )
}

export default App
