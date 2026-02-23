CREATE TABLE std_sismicity (
    dt TIMESTAMP WITH TIME ZONE NOT NULL,
    lat DECIMAL(10,7) NOT NULL,
    lon DECIMAL(10,7) NOT NULL,
    depth DECIMAL(8,2) NOT NULL,
    mag DECIMAL(3,1) NOT NULL,
    place VARCHAR(500),
    source VARCHAR(50),
    depth_log DECIMAL(12,10),
    lat_offset DECIMAL(12,10),
    lon_offset DECIMAL(12,10),
    year INTEGER,
    month_sin DECIMAL(18,16),
    month_cos DECIMAL(18,16),
    hour_sin DECIMAL(18,16),
    hour_cos DECIMAL(18,16),
    rolling_count_7d INTEGER,
    rolling_count_30d INTEGER,
    rolling_mean_mag_30d DECIMAL(4,2),
    days_since_last_major DECIMAL(10,1),
    is_major INTEGER
);

UPDATE std_sismicity s
SET
    rolling_count_7d = sub.cnt_7d,
    rolling_count_30d = sub.cnt_30d,
    rolling_mean_mag_30d = sub.mean_mag_30d
FROM (
    SELECT
        dt,
        COUNT(*) OVER (
            ORDER BY dt
            RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
        ) AS cnt_7d,

        COUNT(*) OVER (
            ORDER BY dt
            RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW
        ) AS cnt_30d,

        AVG(mag) OVER (
            ORDER BY dt
            RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW
        ) AS mean_mag_30d
    FROM std_sismicity
) sub
WHERE s.dt = sub.dt;
