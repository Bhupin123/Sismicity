CREATE TABLE Earthquake(
    earthquake_id SERIAL PRIMARY KEY,
    dt timestamptz NOT NULL,
    depth NUMERIC(8,2),
    mag NUMERIC(3,1),
    depth_log NUMERIC(12,10),
    days_since_last_major NUMERIC(10,1),
    is_major INT,
    place_id int REFERENCES Place (place_id),
    source_id int REFERENCES Source(source_id),
    location_id int REFERENCES Location (location_id),
    time_id int REFERENCES Time_Dimension (time_id),
    stats_id INT REFERENCES Rolling_Statistics(stats_id)
);