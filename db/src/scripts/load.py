from util.db_connection import db_connect

def load():
    print("-----------------------------------------------\n")
    conn = db_connect()
    cur = conn.cursor()

    try:
        # Dimensions FIRST
        print("Loading Place dimension ...")
        cur.execute("CALL load_place()")
        conn.commit()
        print("✓ Place loaded")

        print("\nLoading Source dimension ...")
        cur.execute("CALL load_source()")
        conn.commit()
        print("✓ Source loaded")

        print("\nLoading Location dimension ...")
        cur.execute("CALL load_location()")
        conn.commit()
        print("✓ Location loaded")

        print("\nLoading Time dimension ...")
        cur.execute("CALL load_time_dimension()")
        conn.commit()
        print("✓ Time_Dimension loaded")

        print("\nLoading Rolling Statistics dimension ...")
        cur.execute("CALL load_rolling_statistics()")
        conn.commit()
        print("✓ Rolling_Statistics loaded")

        # FACT TABLE LAST
        print("\nLoading Earthquake fact table ...")
        cur.execute("CALL load_earthquake()")
        conn.commit()
        print("✓ Earthquake loaded")

        print("\n✅ Data Load completed successfully!")
        print("-----------------------------------------------\n")

    except Exception as e:
        conn.rollback()
        print(f"❌ Data Load failed: {e}")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    load()
