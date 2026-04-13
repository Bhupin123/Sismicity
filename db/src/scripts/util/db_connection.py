import os
import psycopg2

def load_env():
    env_path = r'C:\Users\Vupee\Downloads\Sismicity\.env'
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

def db_connect():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sismicity"),
        user=os.getenv("DB_USERNAME", "postgres"),
        password=os.getenv("DB_PASSWORD", "admin"),
        port=os.getenv("DB_PORT", "5432"),
    )
    return conn
