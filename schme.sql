-- ================================
-- EXTENSIONS
-- ================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- ENUMS
-- ================================
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('nurse', 'porter', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('available', 'busy', 'offline');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "RoomType" AS ENUM ('ward', 'icu', 'er', 'storage');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "EquipmentType" AS ENUM ('wheelchair', 'bed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "EquipmentStatus" AS ENUM ('available', 'in_use', 'charging', 'maintenance');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM ('pending', 'queued', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ================================
-- DROP TABLES (if exist)
-- ================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS equipment_location_logs CASCADE;
DROP TABLE IF EXISTS request_queue CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS access_points CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS floors CASCADE;

-- ================================
-- TABLES
-- ================================

CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    building TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    room_type "RoomType" NOT NULL,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    x_coord DOUBLE PRECISION NOT NULL,
    y_coord DOUBLE PRECISION NOT NULL,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role "UserRole" NOT NULL,
    phone TEXT,
    current_status "UserStatus" DEFAULT 'available',
    current_floor_id UUID REFERENCES floors(id),
    active_request_count INTEGER DEFAULT 0,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    priority INTEGER NOT NULL,
    pickup_room_id UUID NOT NULL REFERENCES rooms(id),
    destination_room_id UUID NOT NULL REFERENCES rooms(id),
    equipment_type "EquipmentType" NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    equipment_id UUID,
    status "RequestStatus" DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_code TEXT UNIQUE NOT NULL,
    type "EquipmentType" NOT NULL,
    battery_level INTEGER,
    status "EquipmentStatus" NOT NULL,
    current_floor_id UUID REFERENCES floors(id),
    current_room_id UUID REFERENCES rooms(id),
    current_ap_id UUID REFERENCES access_points(id),
    assigned_request_id UUID,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints after both tables exist
ALTER TABLE requests ADD CONSTRAINT fk_requests_equipment 
    FOREIGN KEY (equipment_id) REFERENCES equipment(id);

ALTER TABLE equipment ADD CONSTRAINT fk_equipment_request 
    FOREIGN KEY (assigned_request_id) REFERENCES requests(id);

CREATE TABLE IF NOT EXISTS request_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    calculated_score DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_location_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES floors(id),
    room_id UUID REFERENCES rooms(id),
    ap_id UUID REFERENCES access_points(id),
    x_coord DOUBLE PRECISION,
    y_coord DOUBLE PRECISION,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_request_id UUID REFERENCES requests(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ================================
-- INSERT DUMMY DATA
-- ================================

DO $$
DECLARE
    v_floor UUID := gen_random_uuid();
    v_zone UUID := gen_random_uuid();
    v_room1 UUID := gen_random_uuid();
    v_room2 UUID := gen_random_uuid();
    v_ap UUID := gen_random_uuid();
    v_nurse UUID := gen_random_uuid();
    v_porter UUID := gen_random_uuid();
    v_wc UUID := gen_random_uuid();
    v_request UUID := gen_random_uuid();
BEGIN

-- Floor
INSERT INTO floors VALUES (v_floor, 'Floor 1', 'Building A');

-- Zone
INSERT INTO zones VALUES (v_zone, 'Zone A', v_floor);

-- Rooms
INSERT INTO rooms VALUES (v_room1, 'ER - Room 101', 'er', v_zone);
INSERT INTO rooms VALUES (v_room2, 'Radiology - Room 301', 'ward', v_zone);

-- Access Point
INSERT INTO access_points VALUES (v_ap, 'AP-ER-01', 120, 80, v_room1);

-- Users (password = 123456)
INSERT INTO users VALUES (
    v_nurse, 'N001', 'Sarah Johnson', 'nurse',
    '0812345678', 'available', v_floor,
    0, crypt('123456', gen_salt('bf')), NOW()
);

INSERT INTO users VALUES (
    v_porter, 'P001', 'Michael Tan', 'porter',
    '0823456789', 'available', v_floor,
    0, crypt('123456', gen_salt('bf')), NOW()
);

-- Admin User (password = admin123)
INSERT INTO users VALUES (
    gen_random_uuid(), 'A001', 'Administrator', 'admin',
    '0891234567', 'available', v_floor,
    0, crypt('admin123', gen_salt('bf')), NOW()
);

-- Equipment
INSERT INTO equipment VALUES (
    v_wc, 'WC-001', 'wheelchair', 90,
    'available', v_floor, v_room1,
    v_ap, NULL, NOW(), NOW()
);

-- Request
INSERT INTO requests VALUES (
    v_request,
    'John Doe',
    1,
    v_room1,
    v_room2,
    'wheelchair',
    v_nurse,
    v_porter,
    v_wc,
    'pending',
    'Urgent transfer',
    NOW(),
    NULL,
    NULL
);

-- Queue
INSERT INTO request_queue VALUES (
    gen_random_uuid(),
    v_request,
    1,
    95.5,
    NOW()
);

-- Notification
INSERT INTO notifications VALUES (
    gen_random_uuid(),
    v_porter,
    'New Request Assigned',
    'Wheelchair needed at ER',
    v_request,
    false,
    NOW()
);

END $$;
