CREATE OR REPLACE PROCEDURE load_earthquake()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Earthquake (
        dt,
        depth,
        mag,
        depth_log,
        days_since_last_major,
        is_major,
        place_id,
        source_id,
        location_id,
        time_id,
        stats_id
    )
    SELECT
        s.dt,
        s.depth,
        s.mag,
        s.depth_log,
        s.days_since_last_major,
        s.is_major,

        p.place_id,
        src.source_id,
        l.location_id,
        t.time_id,
        rs.stats_id

    FROM std_sismicity s

    -- Dimensions
    JOIN Place p
        ON p.place = s.place

    JOIN Source src
        ON src.source = s.source

    JOIN Location l
        ON l.lat = s.lat
       AND l.lon = s.lon

    JOIN Time_Dimension t
        ON t.year = s.year
       AND t.month_sin = s.month_sin
       AND t.month_cos = s.month_cos
       AND t.hour_sin = s.hour_sin
       AND t.hour_cos = s.hour_cos

    JOIN Rolling_Statistics rs
        ON rs.rolling_count_7d = s.rolling_count_7d
       AND rs.rolling_count_30d = s.rolling_count_30d
       AND rs.rolling_mean_mag_30d = s.rolling_mean_mag_30d;

    RAISE NOTICE 'Earthquake fact table loaded successfully';
END;
$$;
