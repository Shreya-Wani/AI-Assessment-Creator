# VedaAI — AI Assessment Creator

> An intelligent, full-stack **AI-powered Assessment Creator** that allows teachers to create assignments and generate structured question papers using Google Gemini AI. Built with modern technologies, JWT-based authentication, role-based access control, and real-time updates via WebSocket.

![Tech Stack](https://img.shields.io/badge/Next.js-TypeScript-blue) ![Backend](https://img.shields.io/badge/Express-Node.js-green) ![AI](https://img.shields.io/badge/Google-Gemini_2.0_Flash-orange) ![DB](https://img.shields.io/badge/MongoDB-Redis-red) ![Auth](https://img.shields.io/badge/Auth-JWT-yellow)

---

## 🏗 Architecture Overview

```
┌─────────────────────┐      WebSocket       ┌──────────────────────────────┐
│                     │ ◄──────────────────► │                              │
│   Next.js App       │                      │   Express API Server         │
│   (Frontend)        │ ───── REST API ────► │                              │
│                     │                      │  ┌──────────┐  ┌──────────┐  │
│  • Zustand Stores   │                      │  │  BullMQ  │  │ Socket.IO│  │
│  • Socket.IO Client │                      │  │  Worker  │  │  Server  │  │
│  • Auth Guard       │                      │  └────┬─────┘  └──────────┘  │
│  • PDF Export       │                      └───────┼────────────────────── ┘
└─────────────────────┘                             │
                              ┌─────────────────────┼──────────────────┐
                              │                     │                  │
                        ┌─────▼──────┐    ┌─────────▼────┐   ┌────────▼───┐
                        │  MongoDB   │    │    Redis     │   │ Gemini AI  │
                        │  Storage  │    │  Cache/Queue │   │   2.0 Flash│
                        └────────────┘    └──────────────┘   └────────────┘
```

### Request Flow
1. Teacher registers/logs in → receives a **JWT token**
2. Teacher fills the assignment creation form on the frontend
3. Frontend sends an authenticated REST API request to the Express backend
4. Backend creates a MongoDB record and queues a **BullMQ** job
5. BullMQ worker picks up the job and calls **Google Gemini AI**
6. AI generates structured questions (sections, difficulty levels, marks)
7. Result is stored in MongoDB and cached in **Redis**
8. **Socket.IO** notifies the frontend in real-time with progress updates
9. Frontend displays the formatted question paper

---

## ✨ Features

### Authentication & Authorization
- **JWT Authentication** — Secure token-based login/register flow
- **Role-Based Access Control** — `teacher` and `student` roles with different permissions
- **Protected Routes** — Frontend `AuthGuard` component redirects unauthenticated users
- **Auth Middleware** — Server-side JWT verification on all protected endpoints

### Teacher Features
- **Assignment Creation Form** — Set due date, question types, marks per type
- **File Upload** — Upload images/PDFs as reference material for question generation
- **AI Question Generation** — Prompt-engineered with Gemini 2.0 Flash
- **Regenerate** — Re-generate questions for any assignment with one click
- **Delete Assignments** — Remove assignments permanently
- **Group Management** — Create and manage student groups
- **Library** — Upload and manage reference files for AI context

### Student Features
- **View Assignments** — Browse assignments shared by teachers
- **Download PDF** — Export any question paper as a formatted PDF

### Platform Features
- **Real-time Progress** — WebSocket updates during question generation
- **Dashboard Stats** — Live statistics fetched from the backend
- **Redis Caching** — Generated papers cached for fast retrieval
- **Premium Dark UI** — Glassmorphism design with smooth micro-animations
- **Mobile Responsive** — Fully responsive on all screen sizes

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 15** + TypeScript | App framework (App Router) |
| **Zustand** | State management (auth, assignments, groups, library, dashboard) |
| **Framer Motion** | Animations and micro-interactions |
| **Socket.IO Client** | Real-time WebSocket updates |
| **html2canvas + jsPDF** | Client-side PDF export |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** (TypeScript) | REST API server |
| **MongoDB** (Mongoose) | Persistent data storage |
| **Redis** (ioredis) | Caching & BullMQ queue backend |
| **BullMQ** | Background job processing for AI generation |
| **Socket.IO** | Real-time server-to-client communication |
| **Google Gemini AI** (2.0 Flash) | AI question generation |
| **JWT + bcryptjs** | Authentication & password hashing |

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally or a cloud URI (e.g. MongoDB Atlas)
- **Redis** running locally or a cloud instance
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)

### 1. Clone the Repository
```bash
git clone <repo-url>
cd AI-Assessment-Creator
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Start the development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env.local from template
cp .env.example .env.local

# Edit .env.local for your environment
# NEXT_PUBLIC_API_URL should include /api suffix
# NEXT_PUBLIC_SOCKET_URL should be backend origin (no /api)

# Start the development server
npm run dev
```

### 4. Open the Application
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/api/health |

---

## ⚙️ Environment Variables

### Backend (`.env`)
```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/vedaai

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# JWT
JWT_SECRET=your_jwt_secret_here

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 🚢 Deployment

For production deployment steps (envs, build checks, hosting patterns, smoke tests), see:

- [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Login and receive JWT |
| `GET` | `/api/auth/me` | Protected | Get current user info |

### Assignments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/assignments` | Teacher | Create assignment & start AI generation |
| `GET` | `/api/assignments` | Teacher, Student | List all assignments |
| `GET` | `/api/assignments/:id` | Teacher, Student | Get assignment details + paper |
| `GET` | `/api/assignments/:id/status` | Teacher, Student | Get generation status |
| `GET` | `/api/assignments/:id/pdf` | Teacher, Student | Download assignment as PDF |
| `POST` | `/api/assignments/:id/regenerate` | Teacher | Regenerate question paper |
| `DELETE` | `/api/assignments/:id` | Teacher | Delete an assignment |

### Groups
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/groups` | Protected | List all groups |
| `POST` | `/api/groups` | Teacher | Create a new group |
| `GET` | `/api/groups/:id` | Protected | Get group details |
| `DELETE` | `/api/groups/:id` | Teacher | Delete a group |

### Library
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/library` | Protected | List all files |
| `POST` | `/api/library` | Teacher | Add a new file |
| `DELETE` | `/api/library/:id` | Teacher | Delete a file |

### Dashboard
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/dashboard` | Protected | Get dashboard statistics |

### Health
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/health` | Public | Server health check |

---

## 🎨 Design Approach

- **Dark Theme** with purple/indigo gradient accents
- **Glassmorphism** card effects with subtle borders
- **Micro-animations** powered by Framer Motion (fade-in, slide-up, hover states)
- **Premium typography** using Inter & Plus Jakarta Sans (Google Fonts)
- **Exam-paper style** output with section hierarchy and difficulty badges
- **Mobile-first** responsive design

---

## 👥 Roles & Permissions

| Feature | Teacher | Student |
|---|:---:|:---:|
| Register / Login | ✅ | ✅ |
| View Assignments | ✅ | ✅ |
| Download PDF | ✅ | ✅ |
| Create Assignments | ✅ | ❌ |
| Delete Assignments | ✅ | ❌ |
| Regenerate Questions | ✅ | ❌ |
| Manage Groups | ✅ | ❌ |
| Manage Library | ✅ | ❌ |

---

## 📝 License

MIT
