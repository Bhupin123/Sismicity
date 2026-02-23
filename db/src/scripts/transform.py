import os
import sys

# Add parent directories to path to import db_connection
current_dir = os.path.dirname(os.path.abspath(__file__))
util_dir = os.path.join(current_dir, '..', 'util')
sys.path.insert(0, util_dir)

from util.db_connection import db_connect

def transform():
    print("-----------------------------------------------\n")
    print("Transforming data into std_sismicity ... ")
    
    try:
        conn = db_connect()
        cur = conn.cursor()
        
        # Truncate the standardized table
        print("[+] Truncating std_sismicity table...")
        cur.execute("TRUNCATE TABLE std_sismicity RESTART IDENTITY CASCADE")
        conn.commit()
        print("✓ Table truncated")
        
        # Call the stored procedure to transform data
        print("[+] Running transformation procedure...")
        cur.execute("CALL transform_sismicity()")
        conn.commit()
        print("✓ Transformation procedure completed")
        
        # Get count of transformed records
        cur.execute("SELECT COUNT(*) FROM std_sismicity")
        count = cur.fetchone()[0]
        print(f"✓ Total records transformed: {count}")
        
        cur.close()
        conn.close()
        
        print("\n✅ Data Transformation complete!")
        print("-----------------------------------------------\n")
        
    except Exception as e:
        print(f"❌ Error during transformation: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    transform()