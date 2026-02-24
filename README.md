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

## Features

### Frontend

- ✨ **Clean, Professional UI** - Minimal design with Tailwind CSS
- 🌙 **Dark Mode** - Full dark mode support
- ⏱️ **Timed Exams** - Optional countdown timer with auto-submit
- 📝 **MCQ Support** - Both single-select and multi-select questions
- 📊 **Detailed Results** - Score breakdown with explanations
- 📱 **Responsive Design** - Works on all devices
- ♿ **Accessible** - WCAG AA+ compliant

### Backend

- 🔐 **User Authentication** - JWT-based auth with bcrypt
- 💾 **MongoDB Storage** - Exam history and results
- 🛡️ **Security** - Helmet, CORS, rate limiting
- ✅ **Input Validation** - Joi schema validation
- 📈 **History Tracking** - Track all exam attempts

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Chart.js** for visualizations (optional)

### Backend

- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Bcrypt** for password hashing

## Getting Started

### Prerequisites

- Node.js 18+ (using v24.12.0)
- MongoDB (local or Atlas)
- npm or pnpm

### Installation

1. **Clone the repository**

   ```bash
   cd exam-prep
   ```

2. **Set up environment variables**

   Create `.env` in root directory:

   ```env
   MONGODB_URI=mongodb://localhost:27017/exam-prep
   JWT_SECRET=your_secure_random_secret_here
   PORT=5000
   CLIENT_URL=http://localhost:5173
   ```

   Create `client/.env`:

   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Install dependencies**

   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install root dependencies (backend)
   cd ..
   npm install
   ```

### Running the Application

#### Development Mode (Concurrent)

```bash
# Run both frontend and backend together
npm run dev
```

#### Frontend Only

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

#### Backend Only

```bash
npm run dev:server
```

API runs on [http://localhost:5000](http://localhost:5000)

### Building for Production

```bash
# Build frontend
cd client
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
exam-prep/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ExamSetup.tsx
│   │   │   ├── ExamInterface.tsx
│   │   │   ├── ExamResults.tsx
│   │   │   ├── Question.tsx
│   │   │   └── Timer.tsx
│   │   ├── store/         # Zustand state management
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions & API
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                # Backend Express application
│   ├── config/           # Database config
│   ├── middleware/       # Auth middleware
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   └── ExamResult.js
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   └── exams.js
│   └── index.js          # Server entry point
├── .github/
│   ├── copilot-instructions.md
│   └── skills/           # Specialized skills
├── package.json          # Root package (scripts)
└── README.md
```

## Usage

### Creating an Exam

1. Click "Create New Exam"
2. Enter exam title, subject (optional), and time limit
3. Paste questions in JSON format:

```json
[
  {
    "question": "What is React?",
    "options": ["A library", "A framework", "A language", "An IDE"],
    "correctAnswer": "A library"
  },
  {
    "question": "Select all valid JavaScript types:",
    "options": ["String", "Integer", "Boolean", "Float"],
    "correctAnswers": ["String", "Boolean"]
  }
]
```

4. Click "Start Exam"

### Taking an Exam

- Navigate through questions using Previous/Next
- Select answers (single or multiple based on question type)
- Watch the timer (if enabled)
- Submit when ready or wait for auto-submit

### Viewing Results

- See your score, percentage, and time taken
- Review each question with correct/incorrect indicators
- Read explanations (if provided)
- Retake or start a new exam

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Exams

- `POST /api/exams/submit` - Submit exam results (protected)
- `GET /api/exams/history` - Get exam history (protected)
- `GET /api/exams/result/:id` - Get specific result (protected)

### Health Check

- `GET /api/health` - Server health check

## Design Philosophy

This app follows a **minimal, professional, human-crafted** design philosophy:

- ✅ Generous whitespace and clean typography
- ✅ Subtle animations and hover states
- ✅ Clear visual hierarchy
- ✅ Accessible color contrast
- ❌ No excessive rounded corners or gradients
- ❌ No flashy animations or AI-generated aesthetics

## Development Guidelines

- Use TypeScript for type safety
- Follow React best practices (hooks, functional components)
- Write clean, readable code with meaningful names
- Test edge cases (timer expiration, multi-select, invalid JSON)
- Maintain accessibility (ARIA labels, keyboard nav)

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Rate limiting: 100 requests per 15 minutes
- Input validation with Joi
- CORS configured for frontend origin
- Helmet for security headers

## License

MIT

## Contributing

Contributions are welcome!

---

Built with ❤️ for learners everywhere.
