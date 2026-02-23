import os
import sys
import pandas as pd
from dotenv import load_dotenv
from kaggle.api.kaggle_api_extended import KaggleApi

# Add parent directories to path to import db_connection
current_dir = os.path.dirname(os.path.abspath(__file__))
util_dir = os.path.join(current_dir, '..', 'util')
sys.path.insert(0, util_dir)

from util.db_connection import db_connect

load_dotenv()

def extract():
    try:
        print("[+] Authenticating Kaggle API...")
        
        # Initialize Kaggle API
        api = KaggleApi()
        api.authenticate()
        
        print("✓ Kaggle API authenticated successfully!")
        
        # Download dataset
        dataset_name = "vupeenthapamagar/nepal-earthquakes-datasets-1990-2026"
        
        print(f"[+] Downloading dataset: {dataset_name}")
        
        # Create data directory
        download_path = "./data/raw"
        os.makedirs(download_path, exist_ok=True)
        
        # Download all files from the dataset
        api.dataset_download_files(dataset_name, path=download_path, unzip=True)
        
        print(f"✓ Dataset downloaded to: {download_path}")
        
        # List downloaded files
        files = os.listdir(download_path)
        print(f"[+] Downloaded files: {files}")
        
        # LOAD SPECIFIC FILE: nepal_seismicity_master.csv
        csv_file = os.path.join(download_path, "nepal_seismicity_master.csv")
        
        if not os.path.exists(csv_file):
            raise FileNotFoundError(f"File not found: {csv_file}")
        
        print(f"[+] Loading CSV file: {csv_file}")
        df = pd.read_csv(csv_file)
        
        print(f"✓ Dataset loaded successfully!")
        print(f"  Shape: {df.shape}")
        print(f"  Actual Columns in CSV: {list(df.columns)}")
        print(f"\n[+] First 5 rows:")
        print(df.head())
        print(f"\n[+] Data types:")
        print(df.dtypes)
        
        # Connect to database
        print(f"\n[+] Connecting to database...")
        conn = db_connect()
        cursor = conn.cursor()
        
        print(f"✓ Database connected successfully!")
        
        # TRUNCATE TABLE BEFORE INSERTING
        print(f"\n[+] Truncating sismicity table...")
        cursor.execute("TRUNCATE TABLE sismicity RESTART IDENTITY CASCADE;")
        conn.commit()
        print(f"✓ Table truncated successfully!")
        
        # Insert data into database
        print(f"\n[+] Inserting {len(df)} rows into database...")
        
        # Build insert query dynamically based on actual columns
        columns = df.columns.tolist()
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join(columns)
        
        insert_query = f"""
        INSERT INTO sismicity ({column_names}) 
        VALUES ({placeholders})
        """
        
        print(f"[DEBUG] Insert query: {insert_query}")
        
        inserted_count = 0
        failed_count = 0
        
        for index, row in df.iterrows():
            try:
                values = tuple(row[col] for col in columns)
                cursor.execute(insert_query, values)
                inserted_count += 1
                
                if (index + 1) % 100 == 0:
                    conn.commit()
                    print(f"  Inserted {index + 1}/{len(df)} rows...")
                    
            except Exception as e:
                # ROLLBACK the transaction on error
                conn.rollback()
                failed_count += 1
                
                # Show detailed error for first 5 failures
                if failed_count <= 5:
                    print(f"\n  [ERROR] Row {index} failed:")
                    print(f"    Error: {e}")
                    print(f"    Row data: {row.to_dict()}")
                
                # Stop if too many errors
                if failed_count > 10:
                    print(f"\n  Too many errors ({failed_count}). Stopping insertion.")
                    break
                
                continue
        
        # Final commit
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"\n✓ Successfully inserted {inserted_count} rows into database!")
        print(f"✗ Failed to insert {failed_count} rows")
        
        return df
        
    except Exception as e:
        print(f"[-] Error occurred: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    df = extract()
    print(f"\n✓ Extraction complete! Total rows: {len(df)}")