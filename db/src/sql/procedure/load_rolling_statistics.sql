CREATE OR REPLACE PROCEDURE load_rolling_statistics()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Rolling_Statistics (
        rolling_count_7d,
        rolling_count_30d,
        rolling_mean_mag_30d
    )
    SELECT DISTINCT
           s.rolling_count_7d,
           s.rolling_count_30d,
           s.rolling_mean_mag_30d
    FROM std_sismicity s
    WHERE NOT EXISTS (
        SELECT 1
        FROM Rolling_Statistics r
        WHERE r.rolling_count_7d = s.rolling_count_7d
          AND r.rolling_count_30d = s.rolling_count_30d
          AND r.rolling_mean_mag_30d = s.rolling_mean_mag_30d
      );
END;
$$;
