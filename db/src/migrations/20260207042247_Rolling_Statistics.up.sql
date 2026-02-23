CREATE TABLE Rolling_Statistics(
stats_id SERIAL PRIMARY KEY,
rolling_count_7d INT,
rolling_count_30d INT,
rolling_mean_mag_30d NUMERIC (4,2)
);