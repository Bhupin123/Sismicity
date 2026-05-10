"""
SeismoIQ FastAPI Backend
Complete earthquake intelligence API with USGS live data fetching
Deployment-ready version (Render + Neon PostgreSQL)
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import numpy as np
import joblib
import os
import sys
from datetime import datetime, timedelta
from contextlib import contextmanager, asynccontextmanager
import asyncio
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# ══════════════════════════════════════════════════════════════════════
#  FIREBASE ADMIN SDK
# ══════════════════════════════════════════════════════════════════════
import firebase_admin
from firebase_admin import credentials, auth as admin_auth

def init_firebase_admin():
    if firebase_admin._apps:
        return
    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serviceAccountKey.json')
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        print("[SeismoIQ] Firebase Admin initialized from serviceAccountKey.json")
        return
    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
    if sa_json:
        import json as _json
        cred = credentials.Certificate(_json.loads(sa_json))
        firebase_admin.initialize_app(cred)
        print("[SeismoIQ] Firebase Admin initialized from environment variable")
        return
    print("[SeismoIQ] Firebase Admin NOT initialized — password reset unavailable")

init_firebase_admin()

# ══════════════════════════════════════════════════════════════════════
#  SENDGRID
# ══════════════════════════════════════════════════════════════════════
def send_reset_email_via_sendgrid(to_email: str, reset_link: str) -> bool:
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0d1b2a;padding:32px;border-radius:12px;">
          <h2 style="color:#00c8ff;margin:0 0 8px;">SeismoIQ</h2>
          <p style="color:#e0e0e0;font-size:15px;">We received a request to reset your password.</p>
          <p style="color:#e0e0e0;font-size:14px;">Click the button below — this link expires in <strong>1 hour</strong>.</p>
          <a href="{reset_link}"
             style="display:inline-block;margin:20px 0;padding:13px 28px;
                    background:linear-gradient(135deg,#00c8ff,#0099cc);
                    color:#fff;text-decoration:none;border-radius:8px;
                    font-weight:700;font-size:15px;">
            Reset My Password
          </a>
          <p style="color:#5a7a99;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.<br>
            — The SeismoIQ Team
          </p>
        </div>
        """
        msg = Mail(
            from_email=(os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@seismoiq.app'), 'SeismoIQ'),
            to_emails=to_email,
            subject='Reset your SeismoIQ password',
            html_content=html,
        )
        sg.send(msg)
        return True
    except Exception as e:
        print(f"SendGrid error: {e}")
        return False

# ══════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════
DB_CONFIG = {
    'host':     os.environ.get('DB_HOST', 'localhost'),
    'database': os.environ.get('DB_NAME', 'sismicity'),
    'user':     os.environ.get('DB_USERNAME', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', 'admin'),
    'port':     int(os.environ.get('DB_PORT', 5432)),
    'sslmode':  os.environ.get('DB_SSLMODE', 'prefer'),
}

_HERE = os.path.dirname(os.path.abspath(__file__))

# Try multiple possible paths for ml/ folder
_possible_paths = [
    os.path.normpath(os.path.join(_HERE, '..', 'ml')),  # backend/../ml (local + Render)
    os.path.normpath(os.path.join(_HERE, 'ml')),         # backend/ml
    '/opt/render/project/src/ml',                         # Render absolute path
]
env_path = os.getenv('ML_MODELS_PATH', '')
if env_path:
    _possible_paths.insert(0, os.path.normpath(env_path))

ML_MODELS_PATH = None
for p in _possible_paths:
    if p and os.path.exists(p):
        files = os.listdir(p)
        if any(f.endswith('.pkl') for f in files):
            ML_MODELS_PATH = p
            break

if ML_MODELS_PATH is None:
    ML_MODELS_PATH = os.path.normpath(os.path.join(_HERE, '..', 'ml'))

# Debug logs — visible in Render logs
print(f"[SeismoIQ] _HERE            = {_HERE}")
print(f"[SeismoIQ] ML_MODELS_PATH   = {ML_MODELS_PATH}")
print(f"[SeismoIQ] ML dir exists    = {os.path.exists(ML_MODELS_PATH)}")
if os.path.exists(ML_MODELS_PATH):
    print(f"[SeismoIQ] ML dir contents  = {os.listdir(ML_MODELS_PATH)}")
else:
    print(f"[SeismoIQ] ML dir NOT FOUND — tried: {_possible_paths}")

sys.path.insert(0, ML_MODELS_PATH)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://sismicity-zzdd.vercel.app",
    "https://seismoiq.vercel.app",
]
_frontend_url = os.environ.get("FRONTEND_URL", "")
if _frontend_url:
    ALLOWED_ORIGINS.append(_frontend_url)

# ══════════════════════════════════════════════════════════════════════
#  ML MODELS
# ══════════════════════════════════════════════════════════════════════
ml_models = {}

def load_ml_models():
    global ml_models
    files = {
        'mag_model':    'magnitude_predictor.pkl',
        'mag_scaler':   'magnitude_scaler.pkl',
        'mag_features': 'magnitude_features.pkl',
        'cls_model':    'major_event_classifier.pkl',
        'cls_scaler':   'classifier_scaler.pkl',
        'cls_features': 'classifier_features.pkl',
    }
    for key, fname in files.items():
        path = os.path.join(ML_MODELS_PATH, fname)
        if os.path.exists(path):
            ml_models[key] = joblib.load(path)
            print(f"[SeismoIQ] Loaded {fname}")
        else:
            print(f"[SeismoIQ] Not found: {path}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_ml_models()
    print(f"[SeismoIQ] Loaded {len(ml_models)} ML model files")
    yield

# ══════════════════════════════════════════════════════════════════════
#  FASTAPI APP
# ══════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="SeismoIQ API",
    description="Earthquake Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════
#  DATABASE
# ══════════════════════════════════════════════════════════════════════
@contextmanager
def get_db():
    conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

# ══════════════════════════════════════════════════════════════════════
#  PYDANTIC MODELS
# ══════════════════════════════════════════════════════════════════════
class EarthquakeResponse(BaseModel):
    id: int
    dt: str
    mag: float
    depth: float
    lat: float
    lon: float
    place: str
    is_major: bool

class StatsResponse(BaseModel):
    total: int
    avg_mag: float
    max_mag: float
    min_mag: float
    avg_depth: float
    major_count: int
    moderate_count: int
    minor_count: int
    date_earliest: str
    date_latest: str

class PredictMagnitudeRequest(BaseModel):
    depth: float = Field(default=10, ge=0, le=700)
    lat: float = Field(default=28, ge=-90, le=90)
    lon: float = Field(default=84, ge=-180, le=180)
    rolling_count_7d: float = Field(default=10, ge=0)
    rolling_count_30d: float = Field(default=50, ge=0)
    rolling_mean_mag_30d: float = Field(default=4.5, ge=0, le=10)
    days_since_last_major: float = Field(default=30, ge=0)

class RiskAssessmentRequest(BaseModel):
    depth: float = Field(default=10, ge=0, le=700)
    lat: float = Field(default=28, ge=-90, le=90)
    lon: float = Field(default=84, ge=-180, le=180)
    rolling_count_7d: float = Field(default=10, ge=0)
    rolling_count_30d: float = Field(default=50, ge=0)
    rolling_mean_mag_30d: float = Field(default=4.5, ge=0, le=10)
    days_since_last_major: float = Field(default=30, ge=0)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class ProximityRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 100
    hours_back: int = 24

class AlertSubscription(BaseModel):
    userId: str
    email: str
    magnitude: float = Field(default=5.0, ge=2.0, le=10.0)
    radius: float = Field(default=100, ge=10, le=1000)
    lat: float
    lon: float

class AlertUnsubscribe(BaseModel):
    userId: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

alert_subscriptions = {}

# ══════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════
def build_features(data: dict) -> pd.DataFrame:
    depth = data.get('depth', 10)
    lat   = data.get('lat', 0)
    lon   = data.get('lon', 0)
    r7    = data.get('rolling_count_7d', 10)
    r30   = data.get('rolling_count_30d', 50)
    rm    = data.get('rolling_mean_mag_30d', 4.5)
    dslm  = data.get('days_since_last_major', 30)
    now   = datetime.now()
    return pd.DataFrame([{
        'depth':                     depth,
        'lat':                       lat,
        'lon':                       lon,
        'rolling_count_7d':          r7,
        'rolling_count_30d':         r30,
        'rolling_mean_mag_30d':      rm,
        'month_sin':                 np.sin(2 * np.pi * now.month / 12),
        'month_cos':                 np.cos(2 * np.pi * now.month / 12),
        'hour_sin':                  np.sin(2 * np.pi * now.hour / 24),
        'hour_cos':                  np.cos(2 * np.pi * now.hour / 24),
        'depth_squared':             depth ** 2,
        'depth_cubed':               depth ** 3,
        'mag_depth_interaction':     0.0,
        'lat_lon_interaction':       lat * lon,
        'lat_depth_interaction':     lat * depth,
        'activity_ratio_7_30':       r7 / (r30 + 1),
        'recent_activity_score':     r7 * rm,
        'days_since_last_major':     dslm,
        'days_since_last_major_log': np.log1p(dslm),
        'recency_score':             1 / (dslm + 1),
        'geo_cluster':               0,
        'is_weekend':                int(now.weekday() >= 5),
        'day_of_year':               now.timetuple().tm_yday,
        'quarter':                   (now.month - 1) // 3 + 1,
    }])

def check_and_send_alerts(new_earthquake: dict):
    try:
        from email_service import send_earthquake_alert
        eq_lat = new_earthquake.get('lat')
        eq_lon = new_earthquake.get('lon')
        eq_mag = new_earthquake.get('mag')
        if not all([eq_lat, eq_lon, eq_mag]):
            return
        from math import radians, sin, cos, sqrt, atan2
        for user_id, sub in alert_subscriptions.items():
            if eq_mag < sub['magnitude']:
                continue
            lat1, lon1 = radians(sub['lat']), radians(sub['lon'])
            lat2, lon2 = radians(eq_lat),     radians(eq_lon)
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
            distance_km = 6371 * 2 * atan2(sqrt(a), sqrt(1-a))
            if distance_km <= sub['radius']:
                send_earthquake_alert(
                    sub['email'],
                    {**new_earthquake, 'distance_km': distance_km},
                    {'email': sub['email']}
                )
    except Exception as e:
        print(f"Alert error: {e}")

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - HEALTH
# ══════════════════════════════════════════════════════════════════════
@app.get("/")
async def root():
    return {"app": "SeismoIQ API", "version": "1.0.0", "status": "online"}

@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check():
    try:
        with get_db() as conn:
            conn.cursor().execute("SELECT 1")
        db_ok = True
    except Exception as e:
        print(f"DB health check failed: {e}")
        db_ok = False
    return {
        "status":      "online",
        "database":    db_ok,
        "ml_models":   len(ml_models) > 0,
        "forecasting": os.path.exists(os.path.join(ML_MODELS_PATH, 'forecasting.py')),
        "chatbot":     os.path.exists(os.path.join(ML_MODELS_PATH, 'chatbot.py')),
        "timestamp":   datetime.now().isoformat()
    }

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - AUTH
# ══════════════════════════════════════════════════════════════════════
@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if not firebase_admin._apps:
        raise HTTPException(status_code=503, detail="Auth service unavailable.")
    try:
        reset_link = admin_auth.generate_password_reset_link(req.email)
    except admin_auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="No account found with this email address.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate reset link: {e}")
    ok = send_reset_email_via_sendgrid(req.email, reset_link)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again.")
    return {"success": True}

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - EARTHQUAKES
# ══════════════════════════════════════════════════════════════════════
@app.get("/api/earthquakes")
async def get_earthquakes(
    limit:     int             = Query(500, ge=1, le=5000),
    offset:    int             = Query(0,   ge=0),
    min_mag:   Optional[float] = None,
    max_mag:   Optional[float] = None,
    days_back: Optional[int]   = None,
    is_major:  Optional[bool]  = None
):
    with get_db() as conn:
        cursor = conn.cursor()
        query  = "SELECT * FROM std_sismicity WHERE 1=1"
        params = []
        if min_mag   is not None: query += " AND mag >= %s";  params.append(min_mag)
        if max_mag   is not None: query += " AND mag <= %s";  params.append(max_mag)
        if days_back is not None: query += " AND dt >= NOW() - INTERVAL '%s days'"; params.append(days_back)
        if is_major  is not None: query += " AND is_major = %s"; params.append(is_major)
        cursor.execute(query.replace("SELECT *", "SELECT COUNT(*)"), params)
        total = cursor.fetchone()['count']
        query += " ORDER BY dt DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        cursor.execute(query, params)
        return {"count": total, "results": [dict(r) for r in cursor.fetchall()]}

@app.get("/api/earthquakes/stats")
async def get_stats(days_back: Optional[int] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        base  = "FROM std_sismicity"
        where = f" WHERE dt >= NOW() - INTERVAL '{days_back} days'" if days_back else ""
        cursor.execute(
            f"SELECT COUNT(*) as total, AVG(mag) as avg_mag, MAX(mag) as max_mag, "
            f"MIN(mag) as min_mag, AVG(depth) as avg_depth, "
            f"MIN(dt) as date_earliest, MAX(dt) as date_latest {base}{where}"
        )
        stats = dict(cursor.fetchone())
        cursor.execute(
            f"SELECT COUNT(*) FILTER (WHERE mag >= 5.5) as major, "
            f"COUNT(*) FILTER (WHERE mag >= 4 AND mag < 5.5) as moderate, "
            f"COUNT(*) FILTER (WHERE mag < 4) as minor {base}{where}"
        )
        cats = dict(cursor.fetchone())
        return {
            "total":          stats['total'] or 0,
            "avg_mag":        round(float(stats['avg_mag']   or 0), 2),
            "max_mag":        round(float(stats['max_mag']   or 0), 2),
            "min_mag":        round(float(stats['min_mag']   or 0), 2),
            "avg_depth":      round(float(stats['avg_depth'] or 0), 1),
            "major_count":    cats['major']    or 0,
            "moderate_count": cats['moderate'] or 0,
            "minor_count":    cats['minor']    or 0,
            "date_earliest":  str(stats['date_earliest'])[:10] if stats['date_earliest'] else '',
            "date_latest":    str(stats['date_latest'])[:10]   if stats['date_latest']   else '',
        }

@app.get("/api/earthquakes/timeline")
async def get_timeline(
    group_by:  str           = Query("day", pattern="^(day|month|year)$"),
    days_back: Optional[int] = None
):
    with get_db() as conn:
        cursor = conn.cursor()
        where  = f" WHERE dt >= NOW() - INTERVAL '{days_back} days'" if days_back else ""
        cursor.execute(
            f"SELECT DATE_TRUNC('{group_by}', dt) as period, "
            f"COUNT(*) as count, AVG(mag) as avg_mag, MAX(mag) as max_mag "
            f"FROM std_sismicity{where} GROUP BY period ORDER BY period"
        )
        return [{"period": str(r['period'])[:10], "count": r['count'],
                 "avg_mag": round(float(r['avg_mag']), 2),
                 "max_mag": round(float(r['max_mag']), 2)}
                for r in cursor.fetchall()]

@app.get("/api/earthquakes/by-location")
async def get_by_location(limit: int = Query(15, ge=1, le=50)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT place, COUNT(*) as count, AVG(mag) as avg_mag, MAX(mag) as max_mag "
            "FROM std_sismicity GROUP BY place ORDER BY count DESC LIMIT %s", (limit,)
        )
        return [dict(r) for r in cursor.fetchall()]

@app.get("/api/earthquakes/recent")
async def get_recent(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(20, ge=1, le=100)
):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM std_sismicity WHERE dt >= NOW() - INTERVAL '%s hours' "
            "ORDER BY dt DESC LIMIT %s", (hours, limit)
        )
        return [dict(r) for r in cursor.fetchall()]

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - USGS LIVE DATA FETCHING
# ══════════════════════════════════════════════════════════════════════
@app.post("/api/earthquakes/fetch-usgs")
async def fetch_usgs_data(
    days_back:     int   = Query(7,   ge=1,  le=30),
    min_magnitude: float = Query(2.5, ge=0,  le=10)
):
    try:
        end_time   = datetime.now()
        start_time = end_time - timedelta(days=days_back)
        response   = requests.get(
            "https://earthquake.usgs.gov/fdsnws/event/1/query",
            params={
                'format': 'geojson',
                'starttime': start_time.strftime('%Y-%m-%d'),
                'endtime': end_time.strftime('%Y-%m-%d'),
                'minmagnitude': min_magnitude,
                'orderby': 'time'
            },
            timeout=30
        )
        response.raise_for_status()
        features = response.json().get('features', [])
        inserted = skipped = 0

        with get_db() as conn:
            cursor = conn.cursor()
            for f in features:
                props  = f['properties']
                coords = f['geometry']['coordinates']
                dt     = datetime.fromtimestamp(props['time'] / 1000)
                mag    = props.get('mag')
                if mag is None: skipped += 1; continue
                depth = coords[2] if len(coords) > 2 else 0
                lat, lon = coords[1], coords[0]
                place = props.get('place', 'Unknown')
                try:
                    cursor.execute(
                        "SELECT COUNT(*) as c FROM std_sismicity "
                        "WHERE dt=%s AND lat=%s AND lon=%s AND mag=%s",
                        (dt, lat, lon, mag)
                    )
                    if cursor.fetchone()['c'] > 0: skipped += 1; continue
                    cursor.execute(
                        "INSERT INTO std_sismicity (dt,mag,depth,lat,lon,place,is_major,source) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                        (dt, mag, depth, lat, lon, place, mag >= 5.5, 'USGS')
                    )
                    inserted += 1
                except Exception as e:
                    print(f"Insert error: {e}"); skipped += 1
            conn.commit()

        for f in features:
            props  = f['properties']
            coords = f['geometry']['coordinates']
            mag    = props.get('mag')
            if mag:
                check_and_send_alerts({
                    'dt':    datetime.fromtimestamp(props['time'] / 1000),
                    'mag':   mag, 'depth': coords[2],
                    'lat':   coords[1], 'lon': coords[0],
                    'place': props.get('place', 'Unknown')
                })

        return {
            "success":  True,
            "fetched":  len(features),
            "inserted": inserted,
            "skipped":  skipped,
            "message":  f"Fetched {len(features)} events. Inserted {inserted} new, skipped {skipped} duplicates."
        }
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"USGS API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - AI / ML
# ══════════════════════════════════════════════════════════════════════
@app.post("/api/ai/predict-magnitude")
async def predict_magnitude(req: PredictMagnitudeRequest):
    if 'mag_model' not in ml_models:
        raise HTTPException(status_code=503, detail="ML models not loaded")
    try:
        df    = build_features(req.dict())
        feats = [f for f in ml_models['mag_features'] if f in df.columns]
        X_sc  = ml_models['mag_scaler'].transform(df[feats].fillna(0))
        pred  = float(ml_models['mag_model'].predict(X_sc)[0])
        conf  = min(95, 70 + abs(pred - 4.5) * 5)
        cat   = 'Major' if pred >= 5.5 else 'Moderate' if pred >= 4.0 else 'Minor'
        return {
            "predicted_magnitude": round(pred, 2),
            "category":            cat,
            "confidence":          round(conf, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/assess-risk")
async def assess_risk(req: RiskAssessmentRequest):
    if 'cls_model' not in ml_models:
        raise HTTPException(status_code=503, detail="Classifier not loaded")
    try:
        df    = build_features(req.dict())
        feats = [f for f in ml_models['cls_features'] if f in df.columns]
        X_sc  = ml_models['cls_scaler'].transform(df[feats].fillna(0))
        prob  = float(ml_models['cls_model'].predict_proba(X_sc)[0][1]) * 100
        level = 'HIGH' if prob > 70 else 'MODERATE' if prob > 30 else 'LOW'
        return {"probability": round(prob, 1), "risk_level": level}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - FORECASTING
# ══════════════════════════════════════════════════════════════════════
forecaster = None

def get_forecaster():
    global forecaster
    if forecaster is None:
        try:
            from forecasting import EarthquakeForecastingSystem
            forecaster = EarthquakeForecastingSystem(DB_CONFIG)
            forecaster.load_historical_data(days_back=365)
            forecaster.train_poisson_forecaster()
        except Exception as e:
            print(f"Forecaster init error: {e}")
    return forecaster

@app.get("/api/forecast")
async def get_forecast(days_ahead: int = Query(7, ge=1, le=30)):
    f = get_forecaster()
    if not f: raise HTTPException(status_code=503, detail="Forecasting unavailable")
    return {"days_ahead": days_ahead, "forecasts": f.forecast_next_events(days_ahead=days_ahead)}

@app.get("/api/forecast/hotspots")
async def get_hotspots(
    eps_km:      float = Query(50, ge=10, le=200),
    min_samples: int   = Query(5,  ge=2,  le=20)
):
    f = get_forecaster()
    if not f: raise HTTPException(status_code=503, detail="Forecasting unavailable")
    result = f.identify_hotspots(eps_km=eps_km, min_samples=min_samples)
    return {"hotspots": result, "count": len(result)}

@app.post("/api/forecast/proximity")
async def check_proximity(req: ProximityRequest):
    f = get_forecaster()
    if not f: raise HTTPException(status_code=503, detail="Forecasting unavailable")
    alerts = f.check_proximity_alert(req.lat, req.lon, req.radius_km, req.hours_back)
    return {"alerts": alerts, "count": len(alerts)}

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - AI CHAT
# ══════════════════════════════════════════════════════════════════════
chatbot = None

def get_chatbot():
    global chatbot
    if chatbot is None:
        try:
            from chatbot import SeismicityChatbot
            chatbot = SeismicityChatbot()
            print("[SeismoIQ] Groq chatbot loaded")
        except Exception as e:
            print(f"Chatbot init error: {e}")
    return chatbot

@app.post("/api/chat")
async def chat(req: ChatRequest):
    bot = get_chatbot()
    if not bot:
        raise HTTPException(status_code=503, detail="Chatbot unavailable — check GROQ_API_KEY")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message required")
    try:
        history = [{"role": m.role, "content": m.content} for m in req.history] if req.history else []
        return {
            "response":  bot.answer_question(req.message, history),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════════════════
#  WEBSOCKET - LIVE FEED
# ══════════════════════════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    async def broadcast(self, message: dict):
        for conn in self.active_connections:
            try: await conn.send_json(message)
            except: pass

manager = ConnectionManager()

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM std_sismicity ORDER BY dt DESC LIMIT 1")
            latest = cursor.fetchone()
            if latest:
                await websocket.send_json({"type": "latest_event", "data": dict(latest)})
    except: pass
    try:
        while True:
            msg = json.loads(await websocket.receive_text())
            if msg.get('type') == 'ping':
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ══════════════════════════════════════════════════════════════════════
#  ALERT ENDPOINTS
# ══════════════════════════════════════════════════════════════════════
@app.post("/api/alerts/subscribe")
async def subscribe_to_alerts(sub: AlertSubscription):
    try:
        alert_subscriptions[sub.userId] = {
            'email':         sub.email,
            'magnitude':     sub.magnitude,
            'radius':        sub.radius,
            'lat':           sub.lat,
            'lon':           sub.lon,
            'subscribed_at': datetime.now().isoformat()
        }
        return {"success": True, "message": f"Subscribed to M{sub.magnitude}+ alerts within {sub.radius}km"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alerts/unsubscribe")
async def unsubscribe_from_alerts(unsub: AlertUnsubscribe):
    alert_subscriptions.pop(unsub.userId, None)
    return {"success": True, "message": "Unsubscribed from alerts"}

@app.get("/api/alerts/subscribers")
async def get_subscribers():
    return {"count": len(alert_subscriptions), "subscribers": list(alert_subscriptions.values())}

@app.post("/api/alerts/test")
async def test_alert(email: str):
    try:
        from email_service import send_earthquake_alert
        result = send_earthquake_alert(
            email,
            {'mag': 5.2, 'place': 'Test Location, Nepal', 'depth': 15,
             'dt': datetime.now(), 'distance_km': 45},
            {'email': email}
        )
        if result:
            return {"success": True, "message": f"Test email sent to {email}"}
        raise HTTPException(status_code=500, detail="Email sending failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))