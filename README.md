# QuizLive 🎯

A real-time Kahoot-style quiz platform built with Node.js, Socket.IO, React, and MySQL. Host live quiz sessions, participants join via QR code or session code, and compete on a live leaderboard.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure admin/host login with access + refresh tokens
- 📝 **Quiz Builder** — Create quizzes with MCQ, True/False, Short Answer, and Poll question types
- 📡 **Real-Time Sessions** — Live quiz sessions powered by Socket.IO
- 📱 **QR Code Join** — Participants scan a QR code or enter a 6-character code to join
- 🏆 **Live Leaderboard** — Real-time score updates after every question
- 🖼️ **Media Support** — Attach images to questions (via file upload)
- 🛡️ **Admin Panel** — Manage users, quizzes, and view analytics
- 📊 **Session Results** — Detailed per-participant answer analytics
- 📦 **cPanel Deployable** — Works on shared hosting with Node.js App support

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
│  ┌─────────────────┐          ┌──────────────────────────┐  │
│  │  Host Dashboard  │          │   Participant Play Page   │  │
│  │  (React SPA)     │          │   (React SPA, mobile)    │  │
│  └────────┬─────────┘          └────────────┬─────────────┘  │
│           │ HTTP REST + Socket.IO            │ Socket.IO      │
└───────────┼─────────────────────────────────┼────────────────┘
            │                                 │
┌───────────▼─────────────────────────────────▼────────────────┐
│                     EXPRESS + SOCKET.IO SERVER                │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  REST API  │  │  Socket.IO   │  │   Static Files     │   │
│  │  /api/v1/  │  │  Namespace   │  │   (uploads/)       │   │
│  └────────────┘  └──────────────┘  └────────────────────┘   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Business Logic Layer                  │  │
│  │  Auth · Quiz · Session · Participant · Answer · Admin   │  │
│  └────────────────────────────┬───────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────┘
                                │ Sequelize ORM
┌───────────────────────────────▼──────────────────────────────┐
│                        MySQL 8+ Database                       │
│   Users · Quizzes · Questions · Options · Sessions ·          │
│   Participants · Answers                                       │
└───────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer       | Technology                          | Version  |
|-------------|-------------------------------------|----------|
| Runtime     | Node.js                             | 20+      |
| Framework   | Express                             | 4.x      |
| Realtime    | Socket.IO                           | 4.x      |
| ORM         | Sequelize                           | 6.x      |
| Database    | MySQL                               | 8+       |
| Auth        | JSON Web Tokens (jsonwebtoken)      | 9.x      |
| Hashing     | bcryptjs                            | 2.x      |
| Validation  | Joi                                 | 17.x     |
| Logging     | Winston                             | 3.x      |
| Frontend    | React + Vite                        | 18+ / 5+ |
| Styling     | Tailwind CSS                        | 3.x      |
| HTTP Client | Axios                               | 1.x      |
| QR Display  | react-qr-code                       | 2.x      |

---

## 📋 Prerequisites

- **Node.js** 20 or higher — [Download](https://nodejs.org/)
- **MySQL** 8.0 or higher — [Download](https://dev.mysql.com/downloads/)
- **npm** 10+ (bundled with Node 20)
- A terminal (PowerShell, bash, etc.)

---

## 🚀 Local Development Setup

### 1. Clone / Download the Project

```bash
git clone <your-repo-url>
cd QnA
```

### 2. Install All Dependencies

```bash
npm run install:all
```

This installs dependencies for both `backend/` and `frontend/`.

### 3. Create the Database

Open MySQL and run:

```sql
CREATE DATABASE quizlive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configure Backend Environment

The file `backend/.env` already exists with development defaults. Edit it if your MySQL credentials differ:

```env
DB_USER=root
DB_PASS=your_mysql_password   # leave blank if no password
DB_NAME=quizlive
```

### 5. Create the First Admin User

```bash
cd backend
node src/scripts/createAdmin.js --name="Admin" --email="admin@example.com" --password="SecurePass123"
```

### 6. Start Development Servers

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
npm run dev:backend
# Server starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
# App opens on http://localhost:5173
```

### 7. Open the App

- **Host Dashboard:** http://localhost:5173/login
- **Participant Join:** http://localhost:5173/join

---

## 🔧 Environment Variables Reference

### Backend (`backend/.env`)

| Variable               | Default                               | Required | Description                                    |
|------------------------|---------------------------------------|----------|------------------------------------------------|
| `NODE_ENV`             | `development`                         | ✅       | `development` or `production`                  |
| `PORT`                 | `5000`                                | ✅       | Port the Express server listens on             |
| `DB_HOST`              | `localhost`                           | ✅       | MySQL host                                     |
| `DB_USER`              | `root`                                | ✅       | MySQL username                                 |
| `DB_PASS`              | *(empty)*                             | ❌       | MySQL password                                 |
| `DB_NAME`              | `quizlive`                            | ✅       | MySQL database name                            |
| `JWT_SECRET`           | *(see .env)*                          | ✅       | Access token signing secret (min 32 chars)     |
| `JWT_REFRESH_SECRET`   | *(see .env)*                          | ✅       | Refresh token signing secret (min 32 chars)    |
| `JWT_EXPIRES_IN`       | `15m`                                 | ✅       | Access token lifetime                          |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                               | ✅       | Refresh token lifetime                         |
| `CLIENT_URL`           | `http://localhost:5173`               | ✅       | Frontend URL (used for CORS)                   |
| `UPLOAD_MAX_SIZE_MB`   | `10`                                  | ❌       | Max file upload size in megabytes              |

### Frontend (`frontend/.env`)

| Variable         | Default                    | Description                              |
|------------------|----------------------------|------------------------------------------|
| `VITE_API_URL`   | `http://localhost:5000`    | Backend API base URL                     |
| `VITE_APP_NAME`  | `QuizLive`                 | Application display name                 |

---

## 📡 Socket.IO QR Code Join Flow

```
HOST                        SERVER                      PARTICIPANT
 │                             │                             │
 │── POST /api/sessions ──────►│                             │
 │◄─ { code, qr_data } ───────│                             │
 │                             │                             │
 │   Show QR code on screen    │      (Scan QR / Enter code) │
 │                             │◄── socket: join_session ───│
 │                             │    { code, nickname }       │
 │                             │── socket: participant_joined►│
 │◄── socket: participant_joined│                            │
 │   (host sees new joiner)    │                             │
 │                             │                             │
 │── socket: start_session ───►│                             │
 │                             │── socket: question_start ──►│
 │                             │    { question, options,     │
 │                             │      timeLimit }            │
 │                             │                             │
 │                             │◄── socket: submit_answer ──│
 │                             │    { optionId, timeTaken }  │
 │◄── socket: answer_received  │                             │
 │   (live answer count)       │── socket: answer_result ───►│
 │                             │    { correct, points }      │
 │                             │                             │
 │── socket: next_question ───►│── socket: question_start ──►│
 │   (or end_session)          │   (next question)           │
 │                             │                             │
 │── socket: end_session ─────►│── socket: session_ended ───►│
 │                             │── socket: leaderboard ─────►│
 │◄── socket: final_results ───│                             │
```

---

## 📚 API Quick Reference

### Authentication

| Method | Endpoint               | Auth | Description              |
|--------|------------------------|------|--------------------------|
| POST   | `/api/auth/login`      | —    | Login, receive tokens    |
| POST   | `/api/auth/refresh`    | —    | Refresh access token     |
| POST   | `/api/auth/logout`     | JWT  | Invalidate refresh token |
| GET    | `/api/auth/me`         | JWT  | Get current user info    |

### Quizzes

| Method | Endpoint                      | Auth      | Description              |
|--------|-------------------------------|-----------|--------------------------|
| GET    | `/api/quizzes`                | JWT       | List my quizzes          |
| POST   | `/api/quizzes`                | JWT       | Create quiz              |
| GET    | `/api/quizzes/:id`            | JWT       | Get quiz with questions  |
| PUT    | `/api/quizzes/:id`            | JWT       | Update quiz              |
| DELETE | `/api/quizzes/:id`            | JWT       | Delete quiz              |
| GET    | `/api/quizzes/:id/questions`  | JWT       | List questions           |
| POST   | `/api/quizzes/:id/questions`  | JWT       | Add question             |

### Sessions

| Method | Endpoint                        | Auth | Description                      |
|--------|---------------------------------|------|----------------------------------|
| POST   | `/api/sessions`                 | JWT  | Create session (get QR + code)   |
| GET    | `/api/sessions/:id`             | JWT  | Get session status               |
| POST   | `/api/sessions/:id/start`       | JWT  | Start session                    |
| POST   | `/api/sessions/:id/next`        | JWT  | Advance to next question         |
| POST   | `/api/sessions/:id/end`         | JWT  | End session                      |
| GET    | `/api/sessions/:id/results`     | JWT  | Get full session results         |
| GET    | `/api/sessions/join/:code`      | —    | Validate session code (public)   |

### Admin

| Method | Endpoint                   | Auth        | Description            |
|--------|----------------------------|-------------|------------------------|
| GET    | `/api/admin/stats`         | JWT + Admin | Dashboard statistics   |
| GET    | `/api/admin/users`         | JWT + Admin | List all users         |
| PATCH  | `/api/admin/users/:id`     | JWT + Admin | Toggle user active     |
| DELETE | `/api/admin/users/:id`     | JWT + Admin | Delete user            |
| GET    | `/api/admin/quizzes`       | JWT + Admin | List all quizzes       |
| DELETE | `/api/admin/quizzes/:id`   | JWT + Admin | Delete any quiz        |

---

## 🌐 cPanel Deployment Guide

### Prerequisites on cPanel Host
- Node.js 20 App support (via cPanel's "Setup Node.js App")
- MySQL database creation access
- File Manager or FTP access
- Terminal access (cPanel Terminal or SSH)

---

### Step 1: Prepare Files Locally

```bash
# Build the frontend
npm run build
# This creates frontend/dist/
```

Zip the `backend/` folder (excluding `node_modules/`, `uploads/`, `logs/`, `.env`):
```
backend.zip  ← server.js, src/, package.json, .env.example
```

---

### Step 2: Create MySQL Database in cPanel

1. In cPanel, go to **MySQL Databases**
2. Create a new database, e.g. `youracct_quizlive`
3. Create a database user, e.g. `youracct_quizuser` with a strong password
4. Add the user to the database with **ALL PRIVILEGES**
5. Note down: host (usually `localhost`), database name, username, password

---

### Step 3: Upload Backend Files

1. In cPanel **File Manager**, navigate to your home directory
2. Create a folder, e.g. `/home/youracct/quizlive-backend/`
3. Upload `backend.zip` and extract it there
4. Your structure should be:
   ```
   /home/youracct/quizlive-backend/
   ├── server.js
   ├── package.json
   └── src/
   ```

---

### Step 4: Set Up Node.js App in cPanel

1. Go to **Setup Node.js App** in cPanel
2. Click **Create Application**
3. Configure:
   - **Node.js version:** `20.x`
   - **Application mode:** `Production`
   - **Application root:** `quizlive-backend` (relative to home)
   - **Application URL:** your domain or subdomain (e.g. `api.yourdomain.com`)
   - **Application startup file:** `server.js`
4. Click **Create**

---

### Step 5: Configure Environment Variables in cPanel UI

In the Node.js App panel, scroll to **Environment Variables** and add each:

| Key                    | Value                                  |
|------------------------|----------------------------------------|
| `NODE_ENV`             | `production`                           |
| `PORT`                 | `5000` (or as assigned by cPanel)      |
| `DB_HOST`              | `localhost`                            |
| `DB_USER`              | `youracct_quizuser`                    |
| `DB_PASS`              | `your_db_password`                     |
| `DB_NAME`              | `youracct_quizlive`                    |
| `JWT_SECRET`           | *(generate: 64+ random chars)*         |
| `JWT_REFRESH_SECRET`   | *(generate: 64+ random chars)*         |
| `JWT_EXPIRES_IN`       | `15m`                                  |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                |
| `CLIENT_URL`           | `https://yourdomain.com`               |
| `UPLOAD_MAX_SIZE_MB`   | `10`                                   |

> **Tip:** Generate secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

### Step 6: Install Dependencies via cPanel Terminal

1. Open **Terminal** in cPanel (or SSH in)
2. Run:

```bash
cd ~/quizlive-backend
npm install --production
```

3. Create the first admin user:

```bash
node src/scripts/createAdmin.js --name="Admin" --email="admin@yourdomain.com" --password="YourSecurePassword123"
```

---

### Step 7: Upload Frontend to public_html

1. In **File Manager**, navigate to `public_html/`
2. Delete or backup existing files
3. Upload all contents of `frontend/dist/` to `public_html/`
4. Upload the `.htaccess` file (see below)

> **Note:** If running on a subdirectory (e.g. `public_html/quiz/`), update Vite's `base` config and re-build.

---

### Step 8: Configure .htaccess for SPA Routing

Create/upload `public_html/.htaccess` with:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QR,L]
```

This ensures React Router handles all client-side routes (refresh won't 404).

---

### Step 9: WebSocket (Socket.IO) Support

> ⚠️ **Important:** Many shared cPanel hosts do not support persistent WebSocket connections. Check with your host.

- Socket.IO automatically falls back to **HTTP long-polling** if WebSockets are blocked.
- For best performance, ask your host to enable **WebSocket proxying** for your Node.js app port.
- If using cPanel's **Passenger** (Phusion), WebSockets may need configuration in `.htaccess`:

```apache
PassengerNodejs /usr/local/bin/node
```

- If WebSockets are fully blocked, the app still works via long-polling (slight latency increase).

---

### Step 10: Start the App

1. In cPanel **Setup Node.js App**, click **Run** (or **Restart** if already running)
2. Visit your domain — the React frontend should load
3. Visit `https://yourdomain.com/login` to access the host dashboard

---

## 📁 Project Structure

```
QnA/
├── package.json              ← Root scripts
├── README.md
├── backend/
│   ├── .env                  ← Dev environment (do not commit)
│   ├── .env.example          ← Template for env vars
│   ├── .gitignore
│   ├── package.json
│   ├── server.js             ← Entry point
│   └── src/
│       ├── config/           ← db.js, env.js, logger.js
│       ├── models/           ← Sequelize models
│       ├── routes/           ← Express routers
│       ├── controllers/      ← Request handlers
│       ├── middleware/        ← Auth, validation, error
│       ├── socket/           ← Socket.IO handlers
│       └── scripts/          ← CLI utilities (createAdmin.js)
└── frontend/
    ├── .env                  ← Dev environment
    ├── .gitignore
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── pages/            ← Route-level components
        ├── components/       ← Shared UI components
        ├── hooks/            ← Custom React hooks
        ├── context/          ← Auth context
        ├── api/              ← Axios client
        └── socket/           ← Socket.IO client
```

---

## 🔒 Security Notes

- Never commit `.env` files to version control
- Always change `JWT_SECRET` and `JWT_REFRESH_SECRET` in production
- Use HTTPS in production (cPanel usually provides Let's Encrypt SSL)
- The `uploads/` directory should not be publicly accessible via Express in production — serve via nginx or restrict access

---

## 📄 License

MIT
