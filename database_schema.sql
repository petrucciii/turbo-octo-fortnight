-- Tabella: tutor_segments
CREATE TABLE tutor_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    highway_name text,
    direction text,
    start_latitude double precision,
    start_longitude double precision,
    end_latitude double precision,
    end_longitude double precision,
    speed_limit_kmh integer,
    segment_length_km double precision,
    start_radius_meters integer DEFAULT 300,
    end_radius_meters integer DEFAULT 300,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Tabella: navigation_sessions
CREATE TABLE navigation_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    origin_latitude double precision,
    origin_longitude double precision,
    destination_name text,
    destination_address text,
    destination_latitude double precision,
    destination_longitude double precision,
    route_distance_km double precision,
    estimated_duration_minutes double precision,
    eta timestamp,
    started_at timestamp DEFAULT now(),
    ended_at timestamp,
    status text
);

-- Tabella: tutor_sessions
CREATE TABLE tutor_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    tutor_segment_id uuid REFERENCES tutor_segments(id),
    entry_time timestamp,
    exit_time timestamp,
    entry_latitude double precision,
    entry_longitude double precision,
    exit_latitude double precision,
    exit_longitude double precision,
    speed_limit_kmh integer,
    average_speed_kmh double precision,
    max_speed_kmh double precision,
    recommended_speed_kmh double precision,
    result_status text,
    created_at timestamp DEFAULT now()
);

-- Tabella: favorite_places
CREATE TABLE favorite_places (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    name text,
    address text,
    latitude double precision,
    longitude double precision,
    type text,
    created_at timestamp DEFAULT now()
);

-- Tabella: recent_destinations
CREATE TABLE recent_destinations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    destination_name text,
    address text,
    latitude double precision,
    longitude double precision,
    last_used_at timestamp DEFAULT now()
);

-- Dati Demo Tutor
INSERT INTO tutor_segments (
    name, highway_name, direction, start_latitude, start_longitude, 
    end_latitude, end_longitude, speed_limit_kmh, segment_length_km, 
    start_radius_meters, end_radius_meters, is_active, notes
) VALUES 
('A4 Milano-Brescia Dir. Est', 'A4', 'Venezia', 45.541, 9.324, 45.568, 9.542, 130, 21.5, 300, 300, true, 'Demo data - Please replace with verified data'),
('A4 Brescia-Verona Dir. Est', 'A4', 'Venezia', 45.474, 10.428, 45.421, 10.871, 130, 38.2, 300, 300, true, 'Demo data - Please replace with verified data'),
('A1 Milano-Lodi Dir. Sud', 'A1', 'Bologna', 45.361, 9.319, 45.249, 9.475, 130, 15.8, 300, 300, true, 'Demo data - Please replace with verified data'),
('A1 Firenze Sud-Incisa Dir. Sud', 'A1', 'Roma', 43.742, 11.319, 43.684, 11.458, 130, 18.5, 300, 300, true, 'Demo data - Please replace with verified data'),
('A14 Forlì-Cesena Dir. Sud', 'A14', 'Rimini', 44.248, 12.062, 44.175, 12.261, 130, 19.3, 300, 300, true, 'Demo data - Please replace with verified data'),
('A27 Treviso-Conegliano Dir. Nord', 'A27', 'Belluno', 45.719, 12.264, 45.859, 12.285, 130, 17.5, 300, 300, true, 'Demo data - Please replace with verified data'),
('A13 Ferrara-Padova Dir. Nord', 'A13', 'Padova', 44.912, 11.637, 45.321, 11.831, 130, 48.0, 300, 300, true, 'Demo data - Please replace with verified data');
