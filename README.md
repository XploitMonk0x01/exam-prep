# Exam Prep — MCQ Practice Platform

A full-stack exam preparation app for multiple-choice questions (MCQs). Supports single-select and multi-select questions, timed exams, dark mode, detailed results with charts, and persistent history for signed-in users.

---

## Features

### Exam Flow

- **JSON-based question input** — paste a question array to instantly create an exam
- **Single-select & multi-select** — auto-detected from `correctAnswers` array length
- **Optional countdown timer** — MM:SS display, orange/red warning when time is low, auto-submits on expiry
- **Quit mid-exam** — confirmation modal before discarding progress
- **Question navigation** — Previous / Next with a progress bar
- **Per-option explanations** — shown after submit if provided in JSON

### Results & Analytics

- **Summary view** — Doughnut chart (score %), per-question Bar chart, stats grid (correct / incorrect / accuracy / questions), unanswered warning
- **Review view** — every question rendered with correct/incorrect highlights and explanations
- **Auto-save to backend** — results stored automatically when the user is signed in

### Authentication & History

- **Register / Login** — JWT-based, passwords hashed with bcrypt
- **Dashboard** — Bar chart of last 10 exam scores, stats cards (total exams, avg score, best score, total time), full history list
- **Guest mode** — full exam flow works without an account; results just aren't persisted

### UI / UX

- **Dark mode** — class-based toggle, persisted to localStorage
- **Minimal, professional design** — Tailwind CSS, Inter font, indigo accent, no visual noise
- **Fully responsive** — mobile-first layout

---

## Tech Stack

| Layer      | Tech                               |
| ---------- | ---------------------------------- |
| Frontend   | React 19, TypeScript, Vite 7       |
| Styling    | Tailwind CSS 3.4 (class dark mode) |
| State      | Zustand (persist middleware)       |
| Charts     | Chart.js v4 + react-chartjs-2      |
| Routing    | React Router v6                    |
| Backend    | Node.js, Express                   |
| Database   | MongoDB + Mongoose                 |
| Auth       | JWT + bcrypt                       |
| Validation | Joi                                |
| Security   | Helmet, CORS, express-rate-limit   |

---

## Project Structure

```
exam-prep/
├── client/                    # React frontend
│   └── src/
│       ├── components/
│       │   ├── Navbar.tsx        # Top nav, dark-mode toggle, auth state
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx     # History, stats, bar chart
│       │   ├── ExamSetup.tsx     # JSON paste + config form
│       │   ├── ExamInterface.tsx # Active exam UI + timer + quit
│       │   ├── ExamResults.tsx   # Summary/Review tabs + charts + auto-save
│       │   ├── Question.tsx      # Radio / checkbox option renderer
│       │   └── Timer.tsx         # Countdown display
│       ├── store/
│       │   ├── authStore.ts      # Zustand auth (persist)
│       │   └── themeStore.ts     # Zustand dark mode (persist)
│       ├── types/index.ts
│       └── utils/api.ts          # Axios wrapper for backend
├── server/
│   ├── config/db.js
│   ├── middleware/auth.js         # JWT verify
│   ├── models/
│   │   ├── User.js
│   │   └── ExamResult.js
│   ├── routes/
│   │   ├── auth.js               # /api/auth/*
│   │   └── exams.js              # /api/exams/*
│   └── index.js
├── .env                          # MongoDB URI, JWT secret, PORT
├── .env.example
├── package.json                  # Root scripts (dev, dev:client, dev:server)
└── eslint.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally **or** a [MongoDB Atlas](https://www.mongodb.com/atlas) URI

### 1 — Environment variables

Copy `.env.example` to `.env` and fill in your values:

```env
MONGODB_URI=mongodb://localhost:27017/exam-prep
JWT_SECRET=replace_with_long_random_string
PORT=5000
CLIENT_URL=http://localhost:5173
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 2 — Install dependencies

```bash
# Root (backend) deps
npm install

# Frontend deps
cd client && npm install
```

### 3 — Run in development

```bash
# Both frontend + backend concurrently (from root)
npm run dev

# Or separately:
npm run dev:client   # Vite on http://localhost:5173
npm run dev:server   # Express on http://localhost:5000
```

---

## Question JSON format

Paste an array into the exam setup form. Supported fields:

```json
[
  {
    "question": "What is React?",
    "options": ["A library", "A framework", "A language", "An IDE"],
    "correctAnswer": "A library",
    "explanation": "React is a UI library, not a full framework."
  },
  {
    "question": "Which are primitive types in JavaScript?",
    "options": ["String", "Object", "Boolean", "Array"],
    "correctAnswers": ["String", "Boolean"],
    "explanation": "Objects and Arrays are reference types."
  }
]
```

- Use `correctAnswer` (string) for single-select, `correctAnswers` (array) for multi-select.
- `explanation` is optional and shown after submit.

---

## API Reference

### Auth — `/api/auth`

| Method | Path        | Auth | Description    |
| ------ | ----------- | ---- | -------------- |
| POST   | `/register` | —    | Create account |
| POST   | `/login`    | —    | Returns JWT    |
| GET    | `/me`       | ✅   | Current user   |

### Exams — `/api/exams`

| Method | Path          | Auth | Description          |
| ------ | ------------- | ---- | -------------------- |
| POST   | `/submit`     | ✅   | Save exam result     |
| GET    | `/history`    | ✅   | All past results     |
| GET    | `/result/:id` | ✅   | Single result detail |

### Misc

| Method | Path          | Description         |
| ------ | ------------- | ------------------- |
| GET    | `/api/health` | Server health check |

---

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Rate limiting: 100 req / 15 min
- Input validated with Joi
- Helmet sets secure HTTP headers
- CORS restricted to `CLIENT_URL`

---

## License

MIT

## Contributing

Contributions are welcome!

---

Built with ❤️ for learners everywhere.
