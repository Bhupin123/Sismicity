import pandas as pd
import psycopg2
from datetime import datetime
import json
import os
from groq import Groq

# ══════════════════════════════════════════════════════════════════════
#  LOAD .ENV MANUALLY
# ══════════════════════════════════════════════════════════════════════
def load_env():
    env_path = r'C:\Users\bhupi\Sismicity\.env'
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()
    except Exception as e:
        print(f"Could not load .env: {e}")

load_env()


class SeismicityChatbot:
    """
    AI-Powered Chatbot using Groq (Free API).
    Answers ANYTHING about earthquakes and the project.
    """

    def __init__(self):
        self.db_config = {
            'host': os.environ.get('DB_HOST', 'localhost'),
            'database': os.environ.get('DB_NAME', 'sismicity'),
            'user': os.environ.get('DB_USERNAME', 'postgres'),
            'password': os.environ.get('DB_PASSWORD', 'bhupin85'),
        }

        api_key = os.environ.get('GROQ_API_KEY')
        if not api_key:
            raise ValueError("GROQ_API_KEY not found. Add it to your .env file.")

        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-8b-instant"
        print("Groq chatbot initialized successfully")

    # ══════════════════════════════════════════════════════════════════
    #  DATABASE HELPERS
    # ══════════════════════════════════════════════════════════════════
    def get_connection(self):
        return psycopg2.connect(**self.db_config)

    def query_data(self, query):
        try:
            from sqlalchemy import create_engine
            db = self.db_config
            engine = create_engine(
                f"postgresql://{db['user']}:{db['password']}@{db['host']}/{db['database']}"
            )
            df = pd.read_sql(query, engine)
            return df
        except Exception as e:
            print(f"DB Error: {e}")
            return pd.DataFrame()

    # ══════════════════════════════════════════════════════════════════
    #  FETCH LIVE DATABASE STATS
    # ══════════════════════════════════════════════════════════════════
    def get_database_summary(self):
        summary = {}
        queries = {
            "total_events": "SELECT COUNT(*) as n FROM std_sismicity",
            "date_range": "SELECT MIN(dt) as first, MAX(dt) as last FROM std_sismicity",
            "avg_magnitude": "SELECT ROUND(AVG(mag)::numeric, 2) as avg FROM std_sismicity",
            "max_magnitude": "SELECT MAX(mag) as max FROM std_sismicity",
            "yearly_counts": "SELECT year, COUNT(*) as count FROM std_sismicity GROUP BY year ORDER BY year",
            "top_locations": "SELECT place, COUNT(*) as count FROM std_sismicity GROUP BY place ORDER BY count DESC LIMIT 10",
            "magnitude_distribution": """
                SELECT
                    COUNT(*) FILTER (WHERE mag < 3.0) AS minor,
                    COUNT(*) FILTER (WHERE mag >= 3.0 AND mag < 5.0) AS moderate,
                    COUNT(*) FILTER (WHERE mag >= 5.0 AND mag < 7.0) AS strong,
                    COUNT(*) FILTER (WHERE mag >= 7.0) AS major
                FROM std_sismicity
            """,
            "depth_stats": "SELECT ROUND(AVG(depth)::numeric,1) as avg, MIN(depth) as min, MAX(depth) as max FROM std_sismicity",
            "recent_events": "SELECT dt, place, mag, depth FROM std_sismicity ORDER BY dt DESC LIMIT 10",
            "largest_earthquake": "SELECT dt, place, mag, depth, lat, lon FROM std_sismicity ORDER BY mag DESC LIMIT 1",
        }
        for key, q in queries.items():
            df = self.query_data(q)
            if not df.empty:
                summary[key] = df.to_dict(orient='records') if len(df) > 1 else df.iloc[0].to_dict()
        return summary

    # ══════════════════════════════════════════════════════════════════
    #  DYNAMIC SQL GENERATION
    # ══════════════════════════════════════════════════════════════════
    def run_dynamic_query(self, question):
        schema_info = """
        Table: std_sismicity
        Columns:
          - dt (timestamp with timezone): earthquake datetime
          - mag (numeric): magnitude
          - depth (numeric): depth in km
          - lat (numeric): latitude
          - lon (numeric): longitude
          - place (text): location description
          - source (text): data source
          - is_major (boolean): True if mag >= 5.5
          - year (integer): extracted year
          - rolling_count_7d, rolling_count_30d (numeric): rolling event counts
          - rolling_mean_mag_30d (numeric): 30-day rolling avg magnitude
          - days_since_last_major (numeric): days since last M>=5.5 event
        """
        sql_prompt = f"""You are a PostgreSQL expert. Given this schema:
{schema_info}

Generate ONE valid PostgreSQL SELECT query to answer: "{question}"

Rules:
- Return ONLY the raw SQL, no markdown, no backticks, no explanation
- LIMIT results to 20 rows
- If not answerable with SQL, return: SELECT 'N/A' as result
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": sql_prompt}],
                max_tokens=300,
                temperature=0
            )
            sql_query = response.choices[0].message.content.strip()
            sql_query = sql_query.replace('```sql', '').replace('```', '').strip()

            if not sql_query.upper().startswith("SELECT"):
                return None, None

            df = self.query_data(sql_query)
            return sql_query, df
        except Exception as e:
            print(f"SQL generation error: {e}")
            return None, None

    # ══════════════════════════════════════════════════════════════════
    #  MAIN ANSWER METHOD
    # ══════════════════════════════════════════════════════════════════
    def answer_question(self, question, chat_history=None):
        # Step 1: Get live database stats
        db_summary = self.get_database_summary()

        # Step 2: Run dynamic SQL query
        sql_query, query_results = self.run_dynamic_query(question)
        query_results_str = ""
        if query_results is not None and not query_results.empty:
            query_results_str = f"\n\nLive Query Results:\n{query_results.to_string(index=False)}"

        # Step 3: Build system prompt
        system_prompt = f"""You are SeismoIQ — an expert AI assistant for a full-stack earthquake analytics platform.

You answer ANYTHING about:
1. Earthquake data from the live database
2. The project itself (tech stack, ML models, features, architecture)
3. General earthquake science and geology
4. How to use the platform

PROJECT TECH STACK:
- Frontend: React + Vite
- Backend: FastAPI (Python)
- Database: PostgreSQL
- ML: Scikit-learn (Gradient Boosting, Random Forest, DBSCAN)
- Visualization: Plotly, Mapbox

ML MODELS:
1. Magnitude Predictor — Gradient Boosting Regressor, RMSE 0.3-0.5, R2 0.65-0.75
2. Major Event Classifier — Random Forest, Precision 70-80%, ROC-AUC 0.80-0.85
3. Risk Score Model — Gradient Boosting, score 0-100
4. Poisson Forecasting — statistical probability forecasting
5. Hotspot Detection — DBSCAN clustering with Haversine distance

DATABASE SCHEMA:
- Table: std_sismicity
- Columns: dt, mag, depth, lat, lon, place, source, is_major, year
- Engineered: rolling_count_7d, rolling_count_30d, rolling_mean_mag_30d, days_since_last_major

DATA SOURCE: USGS Earthquake API (global M4.5+, real-time)

LIVE DATABASE STATS:
{json.dumps(db_summary, indent=2, default=str)}
{query_results_str}

RESPONSE RULES:
- Answer directly and precisely
- Use plain conversational text
- Only use bullet points when listing multiple items
- No excessive bold text or headers for simple answers
- Include real numbers from the live data above
- Never say you do not know — use the data provided
- Format numbers with commas (12,345)
"""

        # Step 4: Build messages with history
        messages = [{"role": "system", "content": system_prompt}]

        if chat_history:
            for msg in chat_history[-6:]:
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": question})

        # Step 5: Get Groq response
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1500,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"