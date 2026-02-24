"""
SeismoIQ FastAPI Backend
Complete earthquake intelligence API with USGS live data fetching
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import numpy as np
import joblib
import os
import sys
from datetime import datetime, timedelta
from contextlib import contextmanager
import asyncio
import json
import requests

# ══════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════
DB_CONFIG = {
    'host': 'localhost',
    'database': 'sismicity',
    'user': 'postgres',
    'password': 'bhupin85',
}

ML_MODELS_PATH = os.getenv('ML_MODELS_PATH', r'C:\Users\bhupi\Sismicity\ml')
sys.path.insert(0, ML_MODELS_PATH)

# ══════════════════════════════════════════════════════════════════════
#  FASTAPI APP
# ══════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="SeismoIQ API",
    description="Earthquake Intelligence Platform API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
#  ML MODELS - LOAD ON STARTUP
# ══════════════════════════════════════════════════════════════════════
ml_models = {}

def load_ml_models():
    global ml_models
    files = {
        'mag_model': 'magnitude_predictor.pkl',
        'mag_scaler': 'magnitude_scaler.pkl',
        'mag_features': 'magnitude_features.pkl',
        'cls_model': 'major_event_classifier.pkl',
        'cls_scaler': 'classifier_scaler.pkl',
        'cls_features': 'classifier_features.pkl',
    }
    for key, fname in files.items():
        path = os.path.join(ML_MODELS_PATH, fname)
        if os.path.exists(path):
            ml_models[key] = joblib.load(path)
            print(f"✓ Loaded {fname}")

@app.on_event("startup")
async def startup_event():
    load_ml_models()
    print(f"✓ Loaded {len(ml_models)} ML model files")

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

class ChatRequest(BaseModel):
    message: str

class ProximityRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 100
    hours_back: int = 24

# ══════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════
def build_features(data: dict) -> pd.DataFrame:
    """Build ML feature dataframe from input dict"""
    depth = data.get('depth', 10)
    lat = data.get('lat', 0)
    lon = data.get('lon', 0)
    r7 = data.get('rolling_count_7d', 10)
    r30 = data.get('rolling_count_30d', 50)
    rm = data.get('rolling_mean_mag_30d', 4.5)
    dslm = data.get('days_since_last_major', 30)
    now = datetime.now()
    
    return pd.DataFrame([{
        'depth': depth,
        'lat': lat,
        'lon': lon,
        'rolling_count_7d': r7,
        'rolling_count_30d': r30,
        'rolling_mean_mag_30d': rm,
        'month_sin': 0.5,
        'month_cos': 0.5,
        'hour_sin': 0.0,
        'hour_cos': 1.0,
        'depth_squared': depth ** 2,
        'depth_cubed': depth ** 3,
        'mag_depth_interaction': 0.0,
        'lat_lon_interaction': lat * lon,
        'lat_depth_interaction': lat * depth,
        'activity_ratio_7_30': r7 / (r30 + 1),
        'recent_activity_score': r7 * rm,
        'days_since_last_major': dslm,
        'days_since_last_major_log': np.log1p(dslm),
        'recency_score': 1 / (dslm + 1),
        'geo_cluster': 0,
        'is_weekend': 0,
        'day_of_year': now.timetuple().tm_yday,
        'quarter': (now.month - 1) // 3 + 1,
    }])

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - HEALTH
# ══════════════════════════════════════════════════════════════════════
@app.get("/")
async def root():
    return {
        "app": "SeismoIQ API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/api/health")
async def health_check():
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
        db_ok = True
    except:
        db_ok = False
    
    return {
        "status": "online",
        "database": db_ok,
        "ml_models": len(ml_models) > 0,
        "forecasting": os.path.exists(os.path.join(ML_MODELS_PATH, 'forecasting.py')),
        "chatbot": os.path.exists(os.path.join(ML_MODELS_PATH, 'chatbot.py')),
        "timestamp": datetime.now().isoformat()
    }

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - EARTHQUAKES
# ══════════════════════════════════════════════════════════════════════
@app.get("/api/earthquakes")
async def get_earthquakes(
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    min_mag: Optional[float] = None,
    max_mag: Optional[float] = None,
    days_back: Optional[int] = None,
    is_major: Optional[bool] = None
):
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM std_sismicity WHERE 1=1"
        params = []
        
        if min_mag is not None:
            query += f" AND mag >= %s"
            params.append(min_mag)
        if max_mag is not None:
            query += f" AND mag <= %s"
            params.append(max_mag)
        if days_back is not None:
            query += f" AND dt >= NOW() - INTERVAL '%s days'"
            params.append(days_back)
        if is_major is not None:
            query += f" AND is_major = %s"
            params.append(is_major)
        
        # Get total count
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()['count']
        
        # Get paginated results
        query += f" ORDER BY dt DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        return {
            "count": total,
            "results": [dict(row) for row in results]
        }

@app.get("/api/earthquakes/stats")
async def get_stats(days_back: Optional[int] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = "SELECT COUNT(*) as total, AVG(mag) as avg_mag, MAX(mag) as max_mag, MIN(mag) as min_mag, AVG(depth) as avg_depth, MIN(dt) as date_earliest, MAX(dt) as date_latest FROM std_sismicity"
        
        if days_back:
            query += f" WHERE dt >= NOW() - INTERVAL '{days_back} days'"
        
        cursor.execute(query)
        stats = dict(cursor.fetchone())
        
        # Get category counts
        cat_query = "SELECT COUNT(*) FILTER (WHERE mag >= 5.5) as major, COUNT(*) FILTER (WHERE mag >= 4 AND mag < 5.5) as moderate, COUNT(*) FILTER (WHERE mag < 4) as minor FROM std_sismicity"
        if days_back:
            cat_query += f" WHERE dt >= NOW() - INTERVAL '{days_back} days'"
        cursor.execute(cat_query)
        cats = dict(cursor.fetchone())
        
        return {
            "total": stats['total'] or 0,
            "avg_mag": round(float(stats['avg_mag'] or 0), 2),
            "max_mag": round(float(stats['max_mag'] or 0), 2),
            "min_mag": round(float(stats['min_mag'] or 0), 2),
            "avg_depth": round(float(stats['avg_depth'] or 0), 1),
            "major_count": cats['major'] or 0,
            "moderate_count": cats['moderate'] or 0,
            "minor_count": cats['minor'] or 0,
            "date_earliest": str(stats['date_earliest'])[:10] if stats['date_earliest'] else '',
            "date_latest": str(stats['date_latest'])[:10] if stats['date_latest'] else '',
        }

@app.get("/api/earthquakes/timeline")
async def get_timeline(
    group_by: str = Query("day", pattern="^(day|month|year)$"),
    days_back: Optional[int] = None
):
    with get_db() as conn:
        cursor = conn.cursor()
        
        trunc_map = {'day': 'day', 'month': 'month', 'year': 'year'}
        trunc = trunc_map[group_by]
        
        query = f"""
            SELECT DATE_TRUNC('{trunc}', dt) as period,
                   COUNT(*) as count,
                   AVG(mag) as avg_mag,
                   MAX(mag) as max_mag
            FROM std_sismicity
        """
        
        if days_back:
            query += f" WHERE dt >= NOW() - INTERVAL '{days_back} days'"
        
        query += " GROUP BY period ORDER BY period"
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        return [{
            "period": str(row['period'])[:10],
            "count": row['count'],
            "avg_mag": round(float(row['avg_mag']), 2),
            "max_mag": round(float(row['max_mag']), 2)
        } for row in results]

@app.get("/api/earthquakes/by-location")
async def get_by_location(limit: int = Query(15, ge=1, le=50)):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT place,
                   COUNT(*) as count,
                   AVG(mag) as avg_mag,
                   MAX(mag) as max_mag
            FROM std_sismicity
            GROUP BY place
            ORDER BY count DESC
            LIMIT %s
        """
        cursor.execute(query, (limit,))
        results = cursor.fetchall()
        return [dict(row) for row in results]

@app.get("/api/earthquakes/recent")
async def get_recent(hours: int = Query(24, ge=1, le=168), limit: int = Query(20, ge=1, le=100)):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT * FROM std_sismicity
            WHERE dt >= NOW() - INTERVAL '%s hours'
            ORDER BY dt DESC
            LIMIT %s
        """
        cursor.execute(query, (hours, limit))
        results = cursor.fetchall()
        return [dict(row) for row in results]

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - USGS LIVE DATA FETCHING
# ══════════════════════════════════════════════════════════════════════
@app.post("/api/earthquakes/fetch-usgs")
async def fetch_usgs_data(
    days_back: int = Query(7, ge=1, le=30),
    min_magnitude: float = Query(2.5, ge=0, le=10)
):
    """Fetch latest earthquake data from USGS and store in database"""
    try:
        # USGS API endpoint
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days_back)
        
        url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
        params = {
            'format': 'geojson',
            'starttime': start_time.strftime('%Y-%m-%d'),
            'endtime': end_time.strftime('%Y-%m-%d'),
            'minmagnitude': min_magnitude,
            'orderby': 'time'
        }
        
        print(f"Fetching from USGS: {start_time.date()} to {end_time.date()}, min mag {min_magnitude}")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        features = data.get('features', [])
        inserted = 0
        skipped = 0
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            for feature in features:
                props = feature['properties']
                coords = feature['geometry']['coordinates']
                
                # Extract data
                dt = datetime.fromtimestamp(props['time'] / 1000)
                mag = props.get('mag')
                depth = coords[2] if len(coords) > 2 else 0
                lat = coords[1]
                lon = coords[0]
                place = props.get('place', 'Unknown')
                
                if mag is None:
                    skipped += 1
                    continue
                
                # Insert into database (check for duplicates)
                try:
                    # Check if event already exists (same time, location, magnitude)
                    cursor.execute("""
                        SELECT COUNT(*) as c FROM std_sismicity 
                        WHERE dt = %s AND lat = %s AND lon = %s AND mag = %s
                    """, (dt, lat, lon, mag))
                    
                    exists = cursor.fetchone()['c'] > 0
                    
                    if not exists:
                        cursor.execute("""
                            INSERT INTO std_sismicity 
                            (dt, mag, depth, lat, lon, place, is_major, source)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (dt, mag, depth, lat, lon, place, mag >= 5.5, 'USGS'))
                        inserted += 1
                    else:
                        skipped += 1
                except Exception as e:
                    print(f"Error inserting event: {e}")
                    skipped += 1
            
            conn.commit()
        
        print(f"✓ USGS fetch complete: {len(features)} fetched, {inserted} inserted, {skipped} skipped")
        
        return {
            "success": True,
            "fetched": len(features),
            "inserted": inserted,
            "skipped": skipped,
            "message": f"Fetched {len(features)} events from USGS. Inserted {inserted} new records, skipped {skipped} duplicates."
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"USGS API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - AI/ML
# ══════════════════════════════════════════════════════════════════════
@app.post("/api/ai/predict-magnitude")
async def predict_magnitude(req: PredictMagnitudeRequest):
    if 'mag_model' not in ml_models:
        raise HTTPException(status_code=503, detail="ML models not loaded")
    
    try:
        df = build_features(req.dict())
        feats = [f for f in ml_models['mag_features'] if f in df.columns]
        X = df[feats].fillna(0)
        X_scaled = ml_models['mag_scaler'].transform(X)
        pred_mag = float(ml_models['mag_model'].predict(X_scaled)[0])
        
        confidence = min(95, 70 + abs(pred_mag - 4.5) * 5)
        category = 'Major' if pred_mag >= 5.5 else 'Moderate' if pred_mag >= 4.0 else 'Minor'
        
        return {
            "predicted_magnitude": round(pred_mag, 2),
            "category": category,
            "confidence": round(confidence, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/assess-risk")
async def assess_risk(req: RiskAssessmentRequest):
    if 'cls_model' not in ml_models:
        raise HTTPException(status_code=503, detail="Classifier not loaded")
    
    try:
        df = build_features(req.dict())
        feats = [f for f in ml_models['cls_features'] if f in df.columns]
        X = df[feats].fillna(0)
        X_scaled = ml_models['cls_scaler'].transform(X)
        prob = float(ml_models['cls_model'].predict_proba(X_scaled)[0][1]) * 100
        
        risk_level = 'HIGH' if prob > 70 else 'MODERATE' if prob > 30 else 'LOW'
        
        return {
            "probability": round(prob, 1),
            "risk_level": risk_level
        }
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
    if not f:
        raise HTTPException(status_code=503, detail="Forecasting unavailable")
    result = f.forecast_next_events(days_ahead=days_ahead)
    return {"days_ahead": days_ahead, "forecasts": result}

@app.get("/api/forecast/hotspots")
async def get_hotspots(eps_km: float = Query(50, ge=10, le=200), min_samples: int = Query(5, ge=2, le=20)):
    f = get_forecaster()
    if not f:
        raise HTTPException(status_code=503, detail="Forecasting unavailable")
    result = f.identify_hotspots(eps_km=eps_km, min_samples=min_samples)
    return {"hotspots": result, "count": len(result)}

@app.post("/api/forecast/proximity")
async def check_proximity(req: ProximityRequest):
    f = get_forecaster()
    if not f:
        raise HTTPException(status_code=503, detail="Forecasting unavailable")
    alerts = f.check_proximity_alert(req.lat, req.lon, req.radius_km, req.hours_back)
    return {"alerts": alerts, "count": len(alerts)}

# ══════════════════════════════════════════════════════════════════════
#  ENDPOINTS - CHAT
# ══════════════════════════════════════════════════════════════════════
chatbot = None

def get_chatbot():
    global chatbot
    if chatbot is None:
        try:
            from chatbot import SeismicityChatbot
            chatbot = SeismicityChatbot()
        except Exception as e:
            print(f"Chatbot init error: {e}")
    return chatbot

@app.post("/api/chat")
async def chat(req: ChatRequest):
    bot = get_chatbot()
    if not bot:
        raise HTTPException(status_code=503, detail="Chatbot unavailable")
    
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message required")
    
    try:
        reply = bot.answer_question(req.message)
        return {
            "response": reply,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════════════════
#  WEBSOCKET - LIVE UPDATES
# ══════════════════════════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Send latest event on connect
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM std_sismicity ORDER BY dt DESC LIMIT 1")
            latest = cursor.fetchone()
            if latest:
                await websocket.send_json({
                    "type": "latest_event",
                    "data": dict(latest)
                })
    except:
        pass
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get('type') == 'ping':
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)