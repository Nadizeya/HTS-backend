# Equipment Map Screen API Documentation

## Overview
This document describes the APIs for the Hospital Transport System (HTS) Equipment Map screen as shown in the mobile app design.

## Map Screen Components

### 1. Header Section
- **Title**: "Equipment Map"
- **Subtitle**: "Real-time equipment locations"

### 2. Search Bar
- **Functionality**: "Search by ID or location..."
- **API**: `GET /api/map/search?q={query}`

### 3. Filter Chips
- **All (5)**: Shows all equipment with count
- **Wheelchairs**: Filter by wheelchair type
- **Beds**: Filter by bed type
- **API**: `GET /api/map?type=wheelchair` or `GET /api/map?type=bed`

### 4. Floor Selector
- **Display**: Floor buttons (1, 2, 3) with active selection
- **API**: `GET /api/floors` (to get all floors)
- **API**: `GET /api/map?floor_id={floor_id}` (to filter by floor)

### 5. Map/Floor Plan
- **Display**: Visual representation of equipment locations with colored status indicators
- **API**: `GET /api/map/floor/{floor_id}` (comprehensive floor data)
- **Position Data**: x_coord and y_coord from access_points table

### 6. Legend
- **Green**: Available
- **Orange**: In Use
- **Red**: Maintenance
- **Blue**: Charging

### 7. User Location
- **Blue Person Icon**: Shows current user's position
- **API**: `GET /api/map/user-location`

---

## API Endpoints

### Map APIs

#### GET /api/map
**Description**: Get all equipment with their locations for map view

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `floor_id` (optional): Filter by specific floor
- `type` (optional): Filter by equipment type (`wheelchair` or `bed`)
- `status` (optional): Filter by status (`available`, `in_use`, `charging`, `maintenance`)

**Example**:
```
GET /api/map
GET /api/map?floor_id=uuid&type=wheelchair
GET /api/map?status=available
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "equipment_code": "WC-001",
      "type": "wheelchair",
      "battery_level": 90,
      "status": "available",
      "last_seen_at": "2026-02-15T15:43:00Z",
      "position": {
        "x": 120.5,
        "y": 80.3
      },
      "floor": {
        "id": "uuid",
        "name": "Floor 1",
        "building": "Building A"
      },
      "room": {
        "id": "uuid",
        "name": "ER - Room 101",
        "room_type": "er"
      },
      "access_point": {
        "id": "uuid",
        "name": "AP-ER-01",
        "x_coord": 120.5,
        "y_coord": 80.3
      },
      "assigned_request": null
    }
  ],
  "count": 5
}
```

---

#### GET /api/map/floor/:floor_id
**Description**: Get all equipment on a specific floor with comprehensive data (recommended for map screen)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `type` (optional): Filter by equipment type
- `status` (optional): Filter by status

**Example**:
```
GET /api/map/floor/floor-uuid
GET /api/map/floor/floor-uuid?type=wheelchair&status=available
```

**Response**:
```json
{
  "success": true,
  "data": {
    "floor": {
      "id": "uuid",
      "name": "Floor 1",
      "building": "Building A"
    },
    "equipment": [
      {
        "id": "uuid",
        "equipment_code": "WC-001",
        "type": "wheelchair",
        "battery_level": 90,
        "status": "available",
        "last_seen_at": "2026-02-15T15:43:00Z",
        "position": {
          "x": 120.5,
          "y": 80.3
        },
        "room": {
          "id": "uuid",
          "name": "ER - Room 101",
          "room_type": "er"
        },
        "access_point": {
          "id": "uuid",
          "name": "AP-ER-01",
          "x_coord": 120.5,
          "y_coord": 80.3
        }
      }
    ],
    "count": 5,
    "statusBreakdown": {
      "available": 3,
      "in_use": 1,
      "charging": 1,
      "maintenance": 0
    }
  }
}
```

---

#### GET /api/map/search
**Description**: Search equipment by ID or location (for search bar)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `q` (required): Search query (equipment code, type, or room name)
- `floor_id` (optional): Limit search to specific floor
- `type` (optional): Filter by equipment type

**Example**:
```
GET /api/map/search?q=WC-001
GET /api/map/search?q=ER&floor_id=uuid
GET /api/map/search?q=wheelchair&type=wheelchair
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "equipment_code": "WC-001",
      "type": "wheelchair",
      "battery_level": 90,
      "status": "available",
      "position": {
        "x": 120.5,
        "y": 80.3
      },
      "floor": {...},
      "room": {...},
      "access_point": {...}
    }
  ],
  "count": 1,
  "query": "WC-001"
}
```

---

#### GET /api/map/equipment-count
**Description**: Get equipment count summary (for "All (5)" badge)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `floor_id` (optional): Get counts for specific floor

**Example**:
```
GET /api/map/equipment-count
GET /api/map/equipment-count?floor_id=uuid
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 5,
    "byType": {
      "wheelchair": 3,
      "bed": 2
    },
    "byStatus": {
      "available": 3,
      "in_use": 1,
      "charging": 1,
      "maintenance": 0
    }
  }
}
```

---

#### GET /api/map/user-location
**Description**: Get current user's location for displaying on map

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "name": "Sarah Johnson",
    "role": "nurse",
    "employeeCode": "N001",
    "currentFloorId": "uuid",
    "status": "available",
    "position": {
      "x": null,
      "y": null
    }
  }
}
```

**Note**: Position data (x, y) will be available when real-time location tracking is implemented.

---

### Floors APIs

#### GET /api/floors
**Description**: Get all floors (for floor selector)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Floor 1",
      "building": "Building A"
    },
    {
      "id": "uuid",
      "name": "Floor 2",
      "building": "Building A"
    },
    {
      "id": "uuid",
      "name": "Floor 3",
      "building": "Building A"
    }
  ],
  "count": 3
}
```

---

#### GET /api/floors/:id
**Description**: Get floor details with zones and rooms

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Floor 1",
    "building": "Building A",
    "zones": [
      {
        "id": "uuid",
        "name": "Zone A",
        "rooms": [
          {
            "id": "uuid",
            "name": "ER - Room 101",
            "room_type": "er"
          }
        ]
      }
    ]
  }
}
```

---

#### GET /api/floors/:id/equipment
**Description**: Get all equipment on a specific floor

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `type` (optional): Filter by equipment type
- `status` (optional): Filter by status

**Example**:
```
GET /api/floors/floor-uuid/equipment
GET /api/floors/floor-uuid/equipment?type=wheelchair
GET /api/floors/floor-uuid/equipment?status=available
```

---

#### GET /api/floors/:id/stats
**Description**: Get statistics for a specific floor

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "equipment": {
      "total": 5,
      "wheelchair": 3,
      "bed": 2,
      "available": 3,
      "in_use": 1,
      "charging": 1,
      "maintenance": 0
    },
    "zones": 2,
    "rooms": 8
  }
}
```

---

## Map Screen Loading Sequence

### Option 1: Single API Call (Recommended)
```javascript
// 1. Load floors for selector
const floors = await fetch('/api/floors', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Load equipment for selected floor
const floorData = await fetch(`/api/map/floor/${selectedFloorId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Optionally load user location
const userLocation = await fetch('/api/map/user-location', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Display:
// - Floor selector with floors.data
// - Equipment on map with floorData.data.equipment
// - Equipment count badge: floorData.data.count
// - Status indicators from equipment.status
// - User icon at userLocation.data.position
```

### Option 2: Progressive Loading
```javascript
// 1. Load all equipment (faster initial load)
const equipment = await fetch('/api/map', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Load floors separately
const floors = await fetch('/api/floors', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Filter client-side when user selects floor
const floorEquipment = equipment.data.filter(
  e => e.floor.id === selectedFloorId
);
```

---

## UI Mapping

### Floor Selector
```javascript
// Render floor buttons
floors.data.map(floor => ({
  id: floor.id,
  label: floor.name.replace('Floor ', ''), // "Floor 1" -> "1"
  isActive: floor.id === selectedFloorId
}));
```

### Filter Chips
```javascript
const equipmentCount = floorData.data.count;

const filters = [
  { 
    label: `All (${equipmentCount})`, 
    active: !selectedType,
    icon: 'checkmark'
  },
  { 
    label: 'Wheelchairs', 
    active: selectedType === 'wheelchair',
    icon: 'wheelchair',
    count: floorData.data.statusBreakdown?.wheelchair || 0
  },
  { 
    label: 'Beds', 
    active: selectedType === 'bed',
    icon: 'bed',
    count: floorData.data.statusBreakdown?.bed || 0
  }
];
```

### Equipment Markers on Map
```javascript
floorData.data.equipment.map(equipment => ({
  id: equipment.id,
  type: equipment.type, // 'wheelchair' or 'bed'
  position: {
    x: equipment.position.x,
    y: equipment.position.y
  },
  status: equipment.status,
  color: getStatusColor(equipment.status),
  icon: getEquipmentIcon(equipment.type),
  tooltip: `${equipment.equipment_code} - ${equipment.room?.name}`
}));
```

### Status Colors (Legend)
```javascript
function getStatusColor(status) {
  const colors = {
    'available': '#10B981',   // Green
    'in_use': '#F59E0B',      // Orange
    'maintenance': '#EF4444',  // Red
    'charging': '#3B82F6'      // Blue
  };
  return colors[status] || '#6B7280';
}

function getStatusIndicatorSize(status) {
  // Small dot indicator on equipment icon
  return 8; // 8px diameter
}
```

### Search Functionality
```javascript
async function handleMapSearch(query) {
  if (!query) return;
  
  const results = await fetch(
    `/api/map/search?q=${query}&floor_id=${selectedFloorId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  // Pan map to first result and highlight it
  if (results.data.length > 0) {
    const firstResult = results.data[0];
    panMapTo(firstResult.position.x, firstResult.position.y);
    highlightEquipment(firstResult.id);
  }
}
```

### Filter by Type
```javascript
async function filterByType(type) {
  // Update URL or state
  setSelectedType(type);
  
  // Reload equipment with filter
  const filtered = await fetch(
    `/api/map/floor/${selectedFloorId}?type=${type}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  // Update map markers
  updateMapMarkers(filtered.data.equipment);
}
```

### Floor Selection
```javascript
async function selectFloor(floorId) {
  setSelectedFloor(floorId);
  
  // Load equipment for new floor
  const floorData = await fetch(
    `/api/map/floor/${floorId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  // Update map
  updateFloorPlan(floorData.data.floor);
  updateMapMarkers(floorData.data.equipment);
  updateEquipmentCount(floorData.data.count);
}
```

---

## Real-time Updates

For real-time equipment tracking, implement WebSocket or polling:

```javascript
// Option 1: WebSocket (Recommended)
const ws = new WebSocket('ws://localhost:3000/map/realtime');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Update equipment position in real-time
  updateEquipmentPosition(update.equipment_id, update.position);
};

// Option 2: Polling
setInterval(async () => {
  const updated = await fetch(`/api/map/floor/${selectedFloorId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  updateMapMarkers(updated.data.equipment);
}, 5000); // Poll every 5 seconds
```

---

## Performance Optimization

1. **Caching**: Cache floor data and only refresh equipment positions
2. **Viewport Filtering**: Only render equipment visible in current viewport
3. **Debounce Search**: Debounce search input to reduce API calls
4. **Lazy Load Images**: Load floor plan images progressively
5. **Optimize Markers**: Use canvas or SVG clustering for many equipment items

---

## Error Handling

All APIs return consistent error format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common scenarios:
- `404`: Floor not found
- `400`: Invalid search query
- `401`: Unauthorized (missing/invalid token)
- `500`: Server error

---

## Test Accounts

Default accounts:
- Nurse: `N001` / `123456`
- Porter: `P001` / `123456`
- Admin: `A001` / `admin123`

---

## Next Steps

1. **Real-time Tracking**: Implement WebSocket for live updates
2. **Indoor Positioning**: Integrate with RTLS/BLE positioning system
3. **Heatmap**: Add heatmap overlay for equipment density
4. **Route Planning**: Show optimal path to equipment
5. **Historical Tracking**: Show equipment movement trails
6. **Offline Support**: Cache map data for offline viewing
