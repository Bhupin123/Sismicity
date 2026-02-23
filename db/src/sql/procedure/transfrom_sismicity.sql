CREATE OR REPLACE PROCEDURE transform_sismicity() LANGUAGE plpgsql AS $$ BEGIN
INSERT INTO std_sismicity (
        dt,
        lat,
        lon,
        depth,
        mag,
        place,
        source,
        depth_log,
        lat_offset,
        lon_offset,
        year,
        month_sin,
        month_cos,
        hour_sin,
        hour_cos,
        rolling_count_7d,
        rolling_count_30d,
        rolling_mean_mag_30d,
        days_since_last_major,
        is_major
    )
SELECT -- ✅ FIXED: explicit casts everywhere
    dt::timestamptz AS dt,
    lat::decimal(10, 7) AS lat,
    lon::decimal(10, 7) AS lon,
    depth::decimal(8, 2) AS depth,
    mag::decimal(3, 1) AS mag,
    place,
    source,
    -- depth log
    CASE
        WHEN depth::decimal > 0 THEN LOG(depth::decimal)
        ELSE NULL
    END AS depth_log,
    -- Nepal-centered offsets
    lat::decimal - 28.3949 AS lat_offset,
    lon::decimal - 84.1240 AS lon_offset,
    -- year
    EXTRACT(
        YEAR
        FROM dt::timestamptz
    ) AS year,
    -- cyclical features
    SIN(
        2 * PI() * EXTRACT(
            MONTH
            FROM dt::timestamptz
        ) / 12.0
    ) AS month_sin,
    COS(
        2 * PI() * EXTRACT(
            MONTH
            FROM dt::timestamptz
        ) / 12.0
    ) AS month_cos,
    SIN(
        2 * PI() * EXTRACT(
            HOUR
            FROM dt::timestamptz
        ) / 24.0
    ) AS hour_sin,
    COS(
        2 * PI() * EXTRACT(
            HOUR
            FROM dt::timestamptz
        ) / 24.0
    ) AS hour_cos,
    -- placeholders (filled later)
    0 AS rolling_count_7d,
    0 AS rolling_count_30d,
    0.0 AS rolling_mean_mag_30d,
    NULL AS days_since_last_major,
    -- major quake flag
    CASE
        WHEN mag::decimal >= 5.5 THEN 1
        ELSE 0
    END AS is_major
FROM sismicity
WHERE dt IS NOT NULL
    AND lat ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND lon ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND depth ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND mag ~ '^-?[0-9]+(\.[0-9]+)?$';
RAISE NOTICE 'Data transformation completed successfully';
END;
$$;