$env:Path += ";C:\Users\bhupi\AppData\Roaming\npm"

# Verify
yarn --version

# AI/ML MODEL
pip install scikit-learn xgboost tensorflow langchain langchain-anthropic chromadb sentence-transformers

#  SeismoIQ — Earthquake Intelligence Platform

> A full-stack AI-powered earthquake analytics platform with real-time data, machine learning predictions, interactive maps, and an intelligent chatbot assistant.

![SeismoIQ](https://img.shields.io/badge/SeismoIQ-v1.0.0-teal?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)

---

##  Table of Contents

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

---

##  Overview

SeismoIQ is a comprehensive earthquake intelligence platform that ingests live earthquake data from the USGS API, stores it in a PostgreSQL database, and provides powerful analytics through machine learning models, interactive visualizations, and an AI-powered chatbot (powered by Groq LLaMA).

---

##  Features

| Feature | Description |
|--------|-------------|
|  **Map View** | Interactive global earthquake map with Mapbox |
|  **Analytics** | Charts, timelines, and location-based breakdowns |
|  **AI Predict** | ML-powered magnitude and risk prediction |
|  **Forecasting** | Poisson-based statistical earthquake forecasting |
|  **Live Feed** | Real-time earthquake events via WebSocket |
|  **AI Chat** | Groq LLaMA chatbot with live database context |
|  **Alerts** | Email notifications for earthquakes near your location |
|  **USGS Sync** | One-click live data fetch from USGS API |

---

##  Tech Stack

### Frontend
- **React** + **Vite** — Fast, modern UI framework
- **Plotly.js** — Interactive charts and visualizations
- **Mapbox GL** — Interactive earthquake map
- **Tailwind CSS** — Styling

### Backend
- **FastAPI** (Python) — High-performance REST API
- **WebSockets** — Real-time live feed
- **SQLAlchemy** — Database ORM
- **psycopg2** — PostgreSQL driver

### Database
- **PostgreSQL 15** — Primary data store

### Machine Learning
- **Scikit-learn** — ML model training and inference
- **Pandas / NumPy** — Data processing
- **Joblib** — Model serialization

### AI Chatbot
- **Groq API** (LLaMA 3.1 8B) — Free AI chat

### Data Source
- **USGS Earthquake API** — Live global earthquake data

---

##  Project Structure

```
Sismicity/
├── backend/
│   ├── main.py              # FastAPI app — all API endpoints
│   └── email_service.py     # Email alert service (SendGrid)
├── db/
│   ├── src/
│   │   ├── migrations/      # Database migration files
│   │   └── scripts/         # ETL pipeline scripts
│   │       ├── data/        # Raw data files
│   │       ├── util/        # Utility helpers
│   │       ├── __init__.py
│   │       ├── extract.py   # Extract data from USGS/Kaggle
│   │       ├── load.py      # Load data into PostgreSQL
│   │       └── transform.py # Clean and transform data
│   │   └── sql/
│   │       └── procedure/   # SQL stored procedures
│   │           ├── load_earthquake.sql
│   │           ├── load_location.sql
│   │           ├── load_place.sql
│   │           ├── load_rolling_statistics.sql
│   │           ├── load_source.sql
│   │           ├── load_time_dimension.sql
│   │           └── transform_sismicity.sql
│   ├── node_modules/
│   ├── connection-resolver.js
│   ├── main.py              # DB entry point
│   ├── package.json
│   ├── package-lock.json
│   ├── sync-db.yml
│   └── yarn.lock
├── frontend/
│   ├── src/
│   │   ├── pages/           # Overview, Map, Analytics, Chat, etc.
│   │   └── components/      # Reusable UI components
│   ├── index.html
│   └── vite.config.js
├── ml/
│   ├── chatbot.py           # Groq AI chatbot
│   ├── forecasting.py       # Poisson forecasting system
│   ├── magnitude_predictor.pkl
│   ├── magnitude_scaler.pkl
│   ├── magnitude_features.pkl
│   ├── major_event_classifier.pkl
│   ├── classifier_scaler.pkl
│   └── classifier_features.pkl
├── .env                     # Environment variables (never commit!)
├── .gitignore
└── README.md
```

---

##  Prerequisites

Make sure you have the following installed before starting:

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **PostgreSQL 15** — [Download](https://www.postgresql.org/download/)
- **Git** — [Download](https://git-scm.com/)

---

##  Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/yourusername/Sismicity.git
cd Sismicity
```

### Step 2 — Create and activate Python virtual environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Mac/Linux
python -m venv .venv
source .venv/bin/activate
```

### Step 3 — Install Python dependencies

```bash
pip install fastapi uvicorn psycopg2-binary pandas numpy scikit-learn joblib sqlalchemy requests groq python-dotenv sendgrid
```

### Step 4 — Install Frontend dependencies

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

Then connect to the database and create the main table:

```sql
CREATE TABLE std_sismicity (
    id SERIAL PRIMARY KEY,
    dt TIMESTAMP WITH TIME ZONE,
    mag NUMERIC,
    depth NUMERIC,
    lat NUMERIC,
    lon NUMERIC,
    place TEXT,
    source TEXT DEFAULT 'USGS',
    is_major BOOLEAN DEFAULT FALSE,
    year INTEGER,
    rolling_count_7d NUMERIC,
    rolling_count_30d NUMERIC,
    rolling_mean_mag_30d NUMERIC,
    days_since_last_major NUMERIC
);
```

---

##  Environment Variables

Create a `.env` file at the **root** of your project (`C:\Users\yourname\Sismicity\.env`):

```env
# Groq AI (Free) — https://console.groq.com
GROQ_API_KEY=gsk_your_groq_key_here

# PostgreSQL Database
DB_HOST=localhost
DB_NAME=sismicity
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# SendGrid Email (for alerts) — https://sendgrid.com
SENDGRID_API_KEY=SG.your_sendgrid_key_here
SENDGRID_FROM_EMAIL=your@email.com

# Kaggle (optional, for dataset download)
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_key
```

>  **Never commit `.env` to GitHub.** Make sure `.env` is in your `.gitignore`.

---

##  Running the App

### Start the Backend

```bash
cd backend
python main.py
```

Backend runs at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

### Start the Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

##  ML Models

SeismoIQ includes 5 trained ML models located in the `ml/` folder:

| Model | Algorithm | Purpose | Performance |
|-------|-----------|---------|-------------|
| Magnitude Predictor | Gradient Boosting Regressor | Predict earthquake magnitude | RMSE 0.3–0.5, R² 0.65–0.75 |
| Major Event Classifier | Random Forest | Classify M5.5+ events | Precision 70–80%, AUC 0.80–0.85 |
| Risk Score | Gradient Boosting | 0–100 risk score | Calibrated to historical data |
| Poisson Forecaster | Statistical | Events per day forecast | Based on historical rates |
| Hotspot Detector | DBSCAN Clustering | Geographic cluster detection | Haversine distance metric |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check — DB, ML, chatbot status |
| GET | `/api/earthquakes` | Get earthquakes with filters |
| GET | `/api/earthquakes/stats` | Summary statistics |
| GET | `/api/earthquakes/timeline` | Events grouped by day/month/year |
| GET | `/api/earthquakes/by-location` | Top locations by event count |
| GET | `/api/earthquakes/recent` | Recent events (last N hours) |
| POST | `/api/earthquakes/fetch-usgs` | Sync live data from USGS |
| POST | `/api/ai/predict-magnitude` | Predict magnitude from inputs |
| POST | `/api/ai/assess-risk` | Get risk probability score |
| GET | `/api/forecast` | Poisson forecast for next N days |
| GET | `/api/forecast/hotspots` | DBSCAN geographic hotspots |
| POST | `/api/forecast/proximity` | Check earthquakes near a location |
| POST | `/api/chat` | AI chatbot query |
| POST | `/api/alerts/subscribe` | Subscribe to email alerts |
| POST | `/api/alerts/unsubscribe` | Unsubscribe from alerts |
| WS | `/ws/live` | WebSocket live earthquake feed |

---

##  Usage Guide

### Fetching Live Earthquake Data

1. Open the app at **http://localhost:5173**
2. Go to **Overview** or **Live Feed**
3. Click **"Fetch USGS Data"** to pull the latest earthquakes into your database

### Using the AI Chat

1. Click **AI Chat** in the sidebar
2. Ask anything:
   - *"How many earthquakes happened this year?"*
   - *"What was the largest earthquake on record?"*
   - *"Which locations are most seismically active?"*
   - *"What is the recent trend in seismic activity?"*

### Setting Up Earthquake Alerts

1. Go to **Alerts** in the sidebar
2. Enter your email, magnitude threshold, and radius
3. You'll receive email notifications when earthquakes occur near your location

### Running AI Predictions

1. Go to **AI Predict**
2. Enter depth, latitude, longitude, and activity metrics
3. Get predicted magnitude, risk score, and event category

---

##  Getting Free API Keys

| Service | Link | Notes |
|---------|------|-------|
| Groq (AI Chat) | https://console.groq.com | 100% free, no credit card |
| USGS Earthquakes | No key needed | Completely free public API |
| SendGrid (Email) | https://sendgrid.com | Free tier: 100 emails/day |

---

##  Author

**Bhupin Thapa Magar**
- Email: bhupin.thapa.magar@gmail.com
- GitHub: [@vupeenthapamagar](https://github.com/Bhupin123)

---

##  License

This project is licensed under the MIT License.
