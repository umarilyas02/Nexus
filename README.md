<div align="center">

# 🤝 Business Nexus

**A networking platform connecting entrepreneurs and investors — with live video calls, scheduled meetings, document sharing, a simulated wallet, and MFA-protected login.**

</div>

<div align="center">

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)

</div>

Business Nexus is a role-based (entrepreneur / investor) web app built to extend a base "Nexus" project with real peer-to-peer video calling, meeting scheduling, document uploads, a simulated wallet, and two-factor login verification. It's a single-page React + TypeScript app, using Firebase Firestore purely as a real-time signaling and meeting-state store (no traditional backend server).

## ✨ Features

- 👥 **Dual-role platform** — sign in as an *Entrepreneur* or an *Investor*, each with their own dashboard, profile fields (funding needs vs. investment thresholds), and discovery pages
- 🔐 **Two-factor login (MFA)** — after entering credentials, users must confirm a 6-digit verification code in a modal step before reaching the dashboard
- 🔍 **Discovery & profiles** — browse investor/entrepreneur directories and view detailed profile pages (pitch summary, industry, funding stage, investment interests, portfolio, etc.)
- 🤝 **Collaboration requests** — entrepreneurs and investors can send and respond to connection requests
- 💬 **Messaging** — a real-time-feel chat experience between connected users
- 📅 **Scheduled meetings** — investors pick a date/time to request a meeting with an entrepreneur; the entrepreneur accepts or rejects it from their dashboard, with live updates powered by Firestore
- 🎥 **Live video calls (WebRTC)** — accepted meetings generate a dedicated video call room; peers connect directly over WebRTC (STUN + TURN relay) with Firestore used as the signaling channel for offer/answer/ICE candidate exchange
- 📄 **Document management** — upload, list, and remove startup documents (pitch decks, financials, etc.) from a dedicated Documents page
- 💰 **Wallet (simulated)** — a mock wallet with a running balance and deposit / withdraw / transfer / funding actions that generate a local transaction history — no real payments are processed
- 🔔 **Notifications & Deals pages** — dedicated views for activity notifications and in-progress deals
- ⚙️ **Settings** — profile editing and a security panel exposing the two-factor authentication toggle

> **Note on scope:** this is a demo/portfolio-grade build. Authentication, the wallet, and document storage run entirely client-side (mock user data + `localStorage`, no server-side persistence or real payments/file storage). The parts that are genuinely backed by a live service are **meeting scheduling** and **video call signaling**, which use a real Firebase Firestore database.

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Realtime / signaling | Firebase (Firestore) |
| Video calls | Native WebRTC (`RTCPeerConnection`) with STUN/TURN |
| HTTP client | Axios |
| UI helpers | Lucide icons, React Hot Toast, React Dropzone, React Datepicker |
| Linting | ESLint + typescript-eslint |
| Deployment | Vercel (SPA rewrites configured in `vercel.json`) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://firebase.google.com/) project with **Firestore** enabled (required for meeting scheduling and video call signaling)

### 1. Clone & install

```bash
git clone https://github.com/umarilyas02/Nexus.git
cd Nexus
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root with your Firebase Web app config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

These map to `src/firebase.ts`, which initializes Firestore (used for the `client-meetings` collection that powers scheduling and WebRTC signaling).

### 3. Run the dev server

```bash
npm run dev
```

### Other scripts

```bash
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

### Try it out

The login page ships with **demo accounts** (Entrepreneur / Investor buttons pre-fill credentials) and a **demo MFA code (`112233`)** so you can walk through the full login → verification → dashboard flow without setting up real accounts.

## 📁 Project Structure

```
src/
├── components/
│   ├── chat/            # Messaging UI
│   ├── collaboration/   # Collaboration request cards/modals
│   ├── entrepreneur/    # Entrepreneur-specific components
│   ├── investor/        # Investor-specific components
│   ├── layout/          # Dashboard shell, navbar, sidebar
│   └── ui/               # Shared UI primitives (Button, Card, Input, Badge, Avatar…)
├── context/
│   └── AuthContext.tsx  # Mock auth state, login/register/reset, localStorage persistence
├── data/                # Mock seed data (users, messages, collaboration requests)
├── pages/
│   ├── auth/             # Login (with MFA modal) & Register
│   ├── dashboard/         # Entrepreneur & Investor dashboards
│   ├── profile/           # Entrepreneur & Investor profile pages (meeting scheduling lives here)
│   ├── investors/ entrepreneurs/  # Discovery/browse pages
│   ├── messages/ chat/    # Messaging
│   ├── deals/             # Deals pipeline view
│   ├── documents/         # Document upload/list/delete
│   ├── notifications/     # Notifications feed
│   ├── settings/          # Profile & security (2FA) settings
│   ├── videocall/         # WebRTC video call room (Firestore-signaled)
│   └── wallet/            # Simulated wallet & transactions
├── types/                # Shared TypeScript types
├── firebase.ts           # Firebase app + Firestore initialization
└── App.tsx               # Route definitions
```

## 🌐 Deployment

The app is configured for [Vercel](https://vercel.com) as a single-page app — `vercel.json` rewrites all routes to `index.html` so client-side routing works after a full page load/refresh. Remember to set the `VITE_FIREBASE_*` environment variables in your Vercel project settings.

---

<div align="center">

Made by [Umar Ilyas](https://umarilyas.dev)

</div>
