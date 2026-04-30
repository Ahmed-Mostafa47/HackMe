# HackMe - Gamified Cybersecurity Training Platform

HackMe is a graduation project platform for practical cybersecurity learning through controlled labs, exploit-driven scenarios, and measurable progress tracking.

It combines:
- Hands-on white-box and black-box training labs
- Role-based workflows (User/Instructor/Admin/SuperAdmin)
- Scoring and leaderboard progression
- Security monitoring dashboards and audit trails

## Description

Cybersecurity students often struggle to connect theoretical concepts with real attack/defense workflows.  
HackMe solves this by providing a structured web platform where learners interact with realistic vulnerability scenarios in a safe environment, while instructors and admins can monitor performance and security events.

## Features

- User registration, login, email verification, and password management
- Role request and role-based access control
- Lab browsing by type and category
- Flag-based and exploit-based solve flows
- Points calculation and leaderboard ranking
- Comments and engagement features
- Notification system (persistent + optional real-time push)
- Security attempt logs, audit logs, and security dashboard

## Tech Stack

- Frontend: React, React Router, Vite, TailwindCSS, Axios
- Backend: PHP (API/Auth), MySQL
- Real-time notifications (optional): Node.js + Socket.IO
- Infrastructure: Docker Compose (labs/services), local scripts

---

## Prerequisites

### Languages and Runtime Versions
- Node.js `>= 18`
- npm `>= 9`
- PHP `>= 8.1`
- MySQL `>= 8.0` (or compatible MariaDB)

### Required Tools
- Git
- Composer
- XAMPP/WAMP/LAMP or any PHP+MySQL stack
- Optional: Docker + Docker Compose (for labs/services)

### OS Requirements
- Windows 10/11, Linux, or macOS

---

## Installation

1. Clone repository
```bash
git clone <YOUR_REPO_URL>
cd HackMe
```

2. Install frontend dependencies
```bash
npm install
```

3. Install PHP dependencies (auth mailer)
```bash
composer install
```

4. Install notification server dependencies (optional)
```bash
cd notification-server
npm install
cd ..
```

---

## Environment Setup

### 1) Frontend Environment

Create `.env` in project root:
```env
VITE_API_BASE=http://localhost/HackMe/server/api
```

### 2) Backend Database Setup

1. Create database `ctf_platform` (utf8mb4 collation).
2. Import core SQL schema/migrations.
3. Ensure backend connection settings match your local DB host/user/pass/port.

Suggested import order:
- `server/sql/ctf_platform.sql` (or your current core schema file)
- Additional migration files in `server/sql/` as needed for your setup.

### 3) Mail and Notification Setup (Optional)

- Configure SMTP credentials for email verification/reset if required.
- Start notification-server if you want real-time push notifications.

---

## Build / Compilation

### Frontend Production Build
```bash
npm run build
```

### Preview Built Frontend
```bash
npm run preview
```

---

## Run Instructions

### Option A: Local Development

1. Start Apache + MySQL (XAMPP or equivalent).
2. Start frontend:
```bash
npm run dev
```
3. Optional: start notification service
```bash
cd notification-server
node server.js
```

Frontend usually runs on:
- `http://localhost:5173`

Backend should be reachable at:
- `http://localhost/HackMe/server/`

### Option B: Containerized Lab Runtime

For lab families that provide compose files:
```bash
docker compose up -d
```

---

## Deployment (Bonus)

### Docker
- Containerize frontend and backend services separately.
- Use docker-compose for multi-service orchestration (frontend, PHP API, DB, optional notification service).
- Add health checks and restart policies.

### Vercel / Netlify
- Suitable for frontend-only hosting.
- Backend PHP APIs should be hosted separately (VPS/shared hosting/container platform).

### CI/CD Suggestions
- Use GitHub Actions pipeline:
  1. Install dependencies
  2. Run lint/build checks
  3. Run PHP syntax checks
  4. Build artifacts
  5. Deploy to staging/production

---

## Folder Structure Explanation

```text
HackMe/
  src/                         # React frontend app
    features/                  # Feature modules (auth, labs, dashboard, profile...)
    hooks/                     # Custom React hooks
    services/                  # Frontend API services
  server/
    auth/                      # Authentication endpoints
    api/                       # Core API endpoints
    utils/                     # Shared backend helpers (db, security, permissions...)
    sql/                       # SQL schemas/migrations
  notification-server/         # Node + Socket.IO real-time notifications
  scripts/                     # Utility scripts
  public/                      # Static assets
  README.md
```

---

## Beginner Quick Start

1. Install Node, PHP, MySQL, Composer.
2. Clone repo and run `npm install`.
3. Import DB schema into `ctf_platform`.
4. Configure backend DB credentials.
5. Run `npm run dev`.
6. Open `http://localhost:5173`.

If any step fails, check:
- Apache/MySQL running
- Correct DB credentials
- API URL in `.env`
- Browser network tab for failing endpoint

---

## License

Academic project license as defined by the project team/repository owner.
