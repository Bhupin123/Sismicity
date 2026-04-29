# SeismoIQ — Earthquake Intelligence Platform

> A full-stack AI-powered earthquake analytics platform with real-time data, machine learning predictions, interactive maps, Firebase authentication, and an intelligent chatbot assistant.

![SeismoIQ](https://img.shields.io/badge/SeismoIQ-v2.0.0-teal?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [ML Models](#ml-models)
- [API Reference](#api-reference)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [Author](#author)

---

## Overview

SeismoIQ is a comprehensive earthquake intelligence platform that ingests live earthquake data from the USGS API, stores it in a PostgreSQL database, and delivers powerful analytics through machine learning models, interactive visualizations, and an AI-powered chatbot (powered by Groq LLaMA). Users can register and log in via Firebase Authentication, receive email alerts for nearby earthquakes, and explore forecasts, hotspots, and risk scores — all from a modern React dashboard.

---

## Features

| Feature | Description |
|---|---|
| **Authentication** | Firebase-powered user registration, login, and protected routes |
| **Map View** | Interactive global earthquake map powered by Leaflet + OpenStreetMap (free, no API key needed) |
| **Analytics** | Charts, timelines, and location-based breakdowns via Recharts |
| **AI Predict** | Gradient Boosting magnitude and risk prediction |
| **Forecasting** | Poisson-based statistical earthquake forecasting and DBSCAN hotspot detection |
| **Live Feed** | Real-time earthquake events via WebSocket |
| **AI Chat** | Groq LLaMA chatbot with live database context |
| **Alerts** | Email notifications for earthquakes near your location (in-memory, resets on server restart) |
| **Settings** | User preferences and account management |
| **USGS Sync** | One-click live data fetch from the USGS API |

---

## Tech Stack

### Frontend
- **React 18** + **Vite** — Fast, modern UI framework
- **React Router v6** — Client-side routing
- **Leaflet** + **React-Leaflet** — Interactive earthquake map with OpenStreetMap tiles (free, no API key)
- **Recharts** — Interactive charts and visualizations
- **Zustand** — Global state management (`useAppStore`, `useAuthStore`)
- **Axios** — HTTP client for API calls
- **Firebase JS SDK v12** — Authentication
- **clsx** — Conditional className utility

### Backend
- **FastAPI** (Python) — High-performance REST API
- **Uvicorn** — ASGI server
- **WebSockets** — Real-time live feed
- **psycopg2** — PostgreSQL driver
- **SendGrid** — Email alert delivery

### Database
- **PostgreSQL 15** — Primary data store
- **Neon PostgreSQL** — Serverless cloud PostgreSQL (used in production)
- Migrations managed via versioned SQL files in `db/src/migrations/`

### Machine Learning
- **Scikit-learn** — Gradient Boosting magnitude predictor, Random Forest event classifier, risk scoring
- **Pandas / NumPy** — Data processing and feature engineering
- **Joblib** — Model serialization

### AI Chatbot
- **Groq API** (LLaMA 3.1 8B) — Free, fast AI chat with live DB context

### Data Source
- **USGS Earthquake API** — Live global earthquake data (no API key required)

### Deployment
- **Vercel** — Frontend deployment (`vercel.json` configured)
- **Render** — Backend deployment (reads `PORT` env var automatically)
- **Neon** — Serverless PostgreSQL for production
- **Firebase** — Authentication

---

## Project Structure

```
Sismicity/
├── backend/
│   ├── main.py                  # FastAPI app — all API endpoints
│   ├── email_service.py         # Email alert service (SendGrid)
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Backend environment variables (do not commit)
│   └── sendgrid.env             # SendGrid-specific env (do not commit)
│
├── db/
│   ├── src/
│   │   ├── migrations/          # Versioned database migration files (up/down SQL)
│   │   │   ├── ..._create_table_sismicity.up.sql
│   │   │   ├── ..._create_table_std_sismicity.up.sql
│   │   │   ├── ..._Place.up.sql
│   │   │   ├── ..._Earthquake.up.sql
│   │   │   ├── ..._Source.up.sql
│   │   │   ├── ..._Location.up.sql
│   │   │   ├── ..._Rolling_Statistics.up.sql
│   │   │   └── ..._Time_Dimension.up.sql
│   │   ├── scripts/
│   │   │   ├── data/            # Raw data files
│   │   │   ├── util/            # Utility helpers
│   │   │   ├── extract.py       # Extract data from USGS / Kaggle
│   │   │   ├── transform.py     # Clean and transform data
│   │   │   └── load.py          # Load data into PostgreSQL
│   │   └── sql/
│   │       └── procedure/       # SQL stored procedures
│   ├── main.py                  # DB entry point
│   ├── connection-resolver.js
│   ├── kaggle.env               # Kaggle credentials (do not commit)
│   ├── sync-db.yml
│   ├── package.json
│   ├── package-lock.json
│   └── yarn.lock
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Charts.jsx
│   │   │   ├── EarthquakeMap.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Sidebar.module.css
│   │   │   └── UI.jsx
│   │   ├── hooks/
│   │   │   └── index.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Overview.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Predictions.jsx
│   │   │   ├── Forecasting.jsx
│   │   │   ├── LiveFeed.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Alerts.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   ├── api.js           # Axios API client
│   │   │   └── firebase.js      # Firebase config and auth helpers
│   │   ├── store/
│   │   │   ├── useAppStore.js   # Zustand global app state
│   │   │   └── useAuthStore.js  # Zustand auth state
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── layout.css
│   │   ├── .env                 # Frontend src env (do not commit)
│   │   ├── app.jsx
│   │   ├── main.jsx
│   │   └── config.js
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json              # Vercel deployment config
│   ├── package.json
│   ├── package-lock.json
│   ├── .env                     # Local frontend env (do not commit)
│   └── .env.production          # Production env (do not commit secrets)
│
├── ml/
│   ├── chatbot.py               # Groq AI chatbot logic
│   ├── forecasting.py           # Poisson forecasting + DBSCAN hotspots
│   ├── train_model.py           # Model training script
│   ├── magnitude_predictor.pkl  # Gradient Boosting magnitude model (loaded by backend)
│   ├── magnitude_scaler.pkl     # Scaler for magnitude model (loaded by backend)
│   ├── magnitude_features.pkl   # Feature list for magnitude model (loaded by backend)
│   ├── magnitude_xgb.pkl        # XGBoost magnitude model (available, not loaded by default)
│   ├── major_event_classifier.pkl # Random Forest classifier (loaded by backend)
│   ├── classifier_xgb.pkl       # XGBoost classifier (available, not loaded by default)
│   ├── classifier_scaler.pkl    # Scaler for classifier (loaded by backend)
│   ├── classifier_features.pkl  # Feature list for classifier (loaded by backend)
│   ├── risk_score_model.pkl     # Risk scoring model (available, not loaded by default)
│   ├── risk_scaler.pkl
│   └── risk_features.pkl
│
├── visualization/
│   ├── app.py                   # Standalone Plotly/Dash visualization app
│   └── app_BACKUP.py
│
├── fix_load_earthquake.sql      # Hotfix SQL scripts
├── fix_transform.sql
├── package-lock.json            # Root-level package lock
├── .env                         # Root-level env (do not commit)
├── .python-version              # Python version pin
├── kaggle.json                  # Kaggle credentials (do not commit)
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure you have the following installed before starting:

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **PostgreSQL 15** — [Download](https://www.postgresql.org/download/)
- **Git** — [Download](https://git-scm.com/)

---

## Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/Bhupin123/Sismicity.git
cd Sismicity
```

### Step 2 — Create and activate a Python virtual environment

```bash
# Windows (Command Prompt / Git Bash)
python -m venv .venv
.venv\Scripts\activate

# Windows (PowerShell) — run both lines
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.venv\Scripts\Activate.ps1

# Mac / Linux
python -m venv .venv
source .venv/bin/activate
```

### Step 3 — Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

If `requirements.txt` is missing, install manually:

```bash
pip install fastapi uvicorn psycopg2-binary pandas numpy scikit-learn joblib sqlalchemy requests groq python-dotenv sendgrid
```

### Step 4 — Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5 — Set up PostgreSQL database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE sismicity;
```

Then run the migration files from `db/src/migrations/` — apply all `.up.sql` files in chronological order (oldest timestamp first).

---

## Environment Variables

You need **three** separate `.env` files. Never commit any of them to GitHub.

### Root `.env` — `Sismicity/.env`

```env
# PostgreSQL (local)
DB_HOST=localhost
DB_NAME=sismicity
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

### Backend `.env` — `Sismicity/backend/.env`

```env
# PostgreSQL
DB_HOST=localhost
DB_NAME=sismicity
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_PORT=5432
DB_SSLMODE=prefer
# Use DB_SSLMODE=require when connecting to Neon (production)

# Groq AI (Free) — https://console.groq.com
GROQ_API_KEY=gsk_your_groq_key_here

# SendGrid Email Alerts — https://sendgrid.com
SENDGRID_API_KEY=SG.your_sendgrid_key_here
SENDGRID_FROM_EMAIL=your@email.com

# Production only — set these on Render
FRONTEND_URL=https://your-app.vercel.app
PORT=8000
```

### Frontend `.env` — `Sismicity/frontend/.env`

```env
# Backend API base URL
VITE_API_URL=http://localhost:8000

# Firebase — https://console.firebase.google.com
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

For production, copy the above into `frontend/.env.production` and update `VITE_API_URL` to your deployed Render backend URL.

> **Security reminder:** All `.env` files, `kaggle.json`, and `sendgrid.env` must be in `.gitignore` and never pushed to GitHub.

---

## Running the App

### 1. Start the Backend

```bash
cd backend
python main.py
```

- API runs at: **http://localhost:8000**
- Interactive API docs: **http://localhost:8000/docs**

### 2. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

- Frontend runs at: **http://localhost:5173**

---

## ML Models

SeismoIQ's ML models live in the `ml/` folder. The backend automatically loads 6 model files on startup. Additional XGBoost and risk models are available in the folder for experimentation or future integration.

| Model File | Algorithm | Loaded by Backend | Purpose |
|---|---|---|---|
| `magnitude_predictor.pkl` | Gradient Boosting Regressor | Yes | Predict earthquake magnitude |
| `magnitude_scaler.pkl` | StandardScaler | Yes | Feature scaling for magnitude model |
| `magnitude_features.pkl` | Feature list | Yes | Input feature names for magnitude model |
| `major_event_classifier.pkl` | Random Forest Classifier | Yes | Classify M5.5+ major events |
| `classifier_scaler.pkl` | StandardScaler | Yes | Feature scaling for classifier |
| `classifier_features.pkl` | Feature list | Yes | Input feature names for classifier |
| `magnitude_xgb.pkl` | XGBoost Regressor | No (available) | Alternative magnitude model |
| `classifier_xgb.pkl` | XGBoost Classifier | No (available) | Alternative event classifier |
| `risk_score_model.pkl` | Gradient Boosting | No (available) | 0–100 risk score output |
| Poisson Forecaster | Statistical — `forecasting.py` | Lazy-loaded | Events-per-day forecast |
| DBSCAN Hotspot Detector | Clustering — `forecasting.py` | Lazy-loaded | Geographic seismic cluster detection |

To retrain models:

```bash
python ml/train_model.py
```

---

## API Reference

Full interactive docs available at **http://localhost:8000/docs** when the backend is running.

### General

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Root — returns app name, version, and status |
| GET / HEAD | `/api/health` | Health check — DB, ML models, chatbot, forecasting status |

### Earthquakes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/earthquakes` | Get earthquakes with optional filters (magnitude, date range, major flag) |
| GET | `/api/earthquakes/stats` | Summary statistics — totals, averages, min/max, date range |
| GET | `/api/earthquakes/timeline` | Events grouped by `day`, `month`, or `year` |
| GET | `/api/earthquakes/by-location` | Top locations by event count |
| GET | `/api/earthquakes/recent` | Recent events (last N hours, max 168h / 7 days) |
| POST | `/api/earthquakes/fetch-usgs` | Sync live data from USGS (auto-deduplicates) |

### AI & Machine Learning

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/predict-magnitude` | Predict magnitude from depth, lat, lon, and activity metrics |
| POST | `/api/ai/assess-risk` | Get risk level (LOW / MODERATE / HIGH) and probability score |

### Forecasting

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forecast` | Poisson forecast for next N days (1–30) |
| GET | `/api/forecast/hotspots` | DBSCAN geographic hotspot clusters |
| POST | `/api/forecast/proximity` | Check earthquakes near a lat/lon within a radius and time window |

### AI Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send a message to the Groq LLaMA chatbot with optional conversation history |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/alerts/subscribe` | Subscribe to email alerts (stored in-memory — resets on restart) |
| POST | `/api/alerts/unsubscribe` | Unsubscribe from alerts |
| GET | `/api/alerts/subscribers` | List all active alert subscriptions |
| POST | `/api/alerts/test` | Send a test alert email to a given address |

### Real-Time

| Protocol | Endpoint | Description |
|---|---|---|
| WebSocket | `/ws/live` | Live earthquake feed — sends latest event on connect, responds to ping/pong |

---

## Usage Guide

### Register & Log In

1. Open the app at **http://localhost:5173**
2. Click **Register** to create an account via Firebase Authentication
3. Log in — all main pages are protected and require authentication

### Fetching Live Earthquake Data

1. Go to **Overview** or **Live Feed**
2. Click **"Fetch USGS Data"** to pull the latest earthquakes into your database
3. Choose how many days back (1–30) and the minimum magnitude (default 2.5)

### Using the AI Chat

1. Click **AI Chat** in the sidebar
2. Ask anything, for example:
   - *"How many earthquakes happened this year?"*
   - *"What was the largest earthquake on record?"*
   - *"Which locations are most seismically active?"*

### Running AI Predictions

1. Go to **Predictions**
2. Enter depth, latitude, longitude, and recent activity metrics
3. Get predicted magnitude, risk level (LOW / MODERATE / HIGH), and event category (Minor / Moderate / Major)

### Setting Up Earthquake Alerts

1. Go to **Alerts** in the sidebar
2. Enter your email, magnitude threshold, and radius in km
3. You will receive email notifications when matching earthquakes occur near your location

> **Note:** Alert subscriptions are stored in memory on the backend and will reset if the server restarts.

### Viewing Forecasts & Hotspots

1. Go to **Forecasting**
2. See Poisson-based daily event forecasts for up to 30 days ahead
3. View DBSCAN geographic hotspot clusters on the map

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
```

Push to GitHub — Vercel auto-deploys from the `main` branch. Add all `VITE_*` environment variables under **Vercel → Project Settings → Environment Variables**.

### Backend → Render

1. Connect your GitHub repo to [Render](https://render.com)
2. Set the start command to: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Add all backend environment variables in Render's dashboard
4. Set `DB_SSLMODE=require` when using Neon PostgreSQL
5. Set `FRONTEND_URL` to your Vercel app URL so CORS works correctly

### Database → Neon

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech)
2. Set `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT`, and `DB_SSLMODE=require` in Render's environment variables
3. Run the `.up.sql` migration files against your Neon database to set up the schema

---

## Getting Free API Keys

| Service | Link | Notes |
|---|---|---|
| Groq (AI Chat) | https://console.groq.com | 100% free, no credit card needed |
| Firebase (Auth) | https://console.firebase.google.com | Free Spark plan is sufficient |
| USGS Earthquakes | No key needed | Completely free public API |
| SendGrid (Email) | https://sendgrid.com | Free tier: 100 emails/day |
| Neon (Database) | https://neon.tech | Free tier available |
| Render (Backend) | https://render.com | Free tier available |
| Vercel (Frontend) | https://vercel.com | Free tier available |

---

## Author

**Bhupin Thapa Magar**

- Email: [bhupin.thapa.magar@gmail.com](mailto:bhupin.thapa.magar@gmail.com)
- GitHub: [@Bhupin123](https://github.com/Bhupin123)
- Live Site: [SeismoIQ](https://seismoiq.vercel.app)

---

## License

This project is licensed under the MIT License.
