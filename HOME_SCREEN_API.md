# Home Screen API Documentation

## Overview
This document describes the APIs for the Hospital Transport System (HTS) home screen as shown in the mobile app design.

## Home Screen Components

### 1. Header Section
- **User Greeting**: "Good Morning, User"
- **User Info**: Name, Role, Zone, Shift
- **API**: `GET /api/auth/me` or `GET /api/dashboard`

### 2. Search Bar
- **Functionality**: "Find Wheelchair or Bed"
- **API**: `GET /api/equipment/search?q={query}&status=available`

### 3. Nearby Available Equipment Card
- **Display**: Count of available equipment on same floor
- **API**: `GET /api/equipment/nearby`
- **Response**: Returns count and list of nearby equipment

### 4. Active Tasks List
- **Display**: List of active requests with priority badges
- **API**: `GET /api/requests/active`
- **Priority Labels**:
  - `priority: 1` = STAT (Red)
  - `priority: 2` = HIGH (Orange)
  - `priority: 3` = NORMAL (Blue)
  - `priority: 4+` = LOW (Gray)

---

## API Endpoints

### Dashboard API (Recommended)

#### GET /api/dashboard
**Description**: Returns all home screen data in a single call (optimized)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Sarah Johnson",
      "employeeCode": "N001",
      "role": "nurse",
      "status": "available",
      "phone": "0812345678"
    },
    "nearbyEquipment": {
      "count": 12,
      "equipment": [
        {
          "id": "uuid",
          "equipment_code": "WC-001",
          "type": "wheelchair",
          "battery_level": 90,
          "status": "available",
          "current_floor": {
            "id": "uuid",
            "name": "Floor 1",
            "building": "Building A"
          }
        }
      ]
    },
    "activeTasks": [
      {
        "id": "uuid",
        "patient_name": "John Doe",
        "priority": 1,
        "priorityLabel": "STAT",
        "equipment_type": "wheelchair",
        "status": "pending",
        "notes": "Urgent transfer",
        "created_at": "2026-02-15T10:26:00Z",
        "pickup_room": {
          "id": "uuid",
          "name": "ER - Room 101",
          "room_type": "er"
        },
        "destination_room": {
          "id": "uuid",
          "name": "Radiology - Room 301",
          "room_type": "ward"
        }
      }
    ]
  }
}
```

---

### Equipment APIs

#### GET /api/equipment/nearby
**Description**: Get nearby available equipment (same floor as user)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `type` (optional): Filter by equipment type (`wheelchair` or `bed`)

**Example**:
```
GET /api/equipment/nearby
GET /api/equipment/nearby?type=wheelchair
```

**Response**:
```json
{
  "success": true,
  "data": {
    "count": 12,
    "equipment": [...],
    "floor_id": "uuid"
  }
}
```

#### GET /api/equipment/search
**Description**: Search for equipment (for search bar functionality)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `q`: Search query (equipment code, type)
- `type` (optional): Filter by type
- `status` (optional): Filter by status

**Example**:
```
GET /api/equipment/search?q=wheelchair
GET /api/equipment/search?q=WC-001
GET /api/equipment/search?type=wheelchair&status=available
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
      "current_floor": {...},
      "current_room": {...}
    }
  ],
  "count": 5
}
```

---

### Requests/Tasks APIs

#### GET /api/requests/active
**Description**: Get active tasks for the logged-in user

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
      "patient_name": "John Doe",
      "priority": 1,
      "priorityLabel": "STAT",
      "equipment_type": "wheelchair",
      "status": "assigned",
      "notes": "Urgent transfer",
      "created_at": "2026-02-15T10:26:00Z",
      "pickup_room": {
        "id": "uuid",
        "name": "ER - Room 101",
        "room_type": "er"
      },
      "destination_room": {
        "id": "uuid",
        "name": "Radiology - Room 301",
        "room_type": "ward"
      },
      "assigned_user": {
        "id": "uuid",
        "employee_code": "P001",
        "full_name": "Michael Tan"
      }
    }
  ],
  "count": 3
}
```

#### GET /api/requests/:id
**Description**: Get detailed information about a specific request (for task detail screen)

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**: Full request details including all relationships

---

### Authentication APIs

#### POST /api/auth/login
**Description**: Login with employee code and password

**Request Body**:
```json
{
  "employeecode": "N001",
  "password": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "employee_code": "N001",
      "full_name": "Sarah Johnson",
      "role": "nurse",
      "current_status": "available"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /api/auth/me
**Description**: Get current logged-in user information

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
    "employee_code": "N001",
    "full_name": "Sarah Johnson",
    "role": "nurse",
    "phone": "0812345678",
    "current_status": "available",
    "current_floor_id": "uuid"
  }
}
```

---

## Home Screen Loading Sequence

### Option 1: Single API Call (Recommended)
```javascript
// 1. Load all home screen data in one call
const response = await fetch('/api/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { user, nearbyEquipment, activeTasks } = response.data;

// Display:
// - User info in header
// - nearbyEquipment.count in green card
// - activeTasks in list
```

### Option 2: Multiple API Calls
```javascript
// 1. Get user info
const userInfo = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Get nearby equipment count
const equipment = await fetch('/api/equipment/nearby', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Get active tasks
const tasks = await fetch('/api/requests/active', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## UI Mapping

### Header Section
```javascript
const greeting = `Good Morning, ${user.name}`;
const subtitle = `${user.role} • Zone A • Day Shift`;
```

### Nearby Equipment Card
```javascript
const equipmentCount = nearbyEquipment.count; // "12"
const distance = "Within 50 meters"; // Static or calculated
```

### Active Tasks List
```javascript
tasks.map(task => ({
  badge: task.priorityLabel, // "STAT", "HIGH", "NORMAL"
  badgeColor: getBadgeColor(task.priority), // Red, Orange, Blue
  title: `${task.equipment_type} Required`,
  route: `${task.pickup_room.name} → ${task.destination_room.name}`,
  time: formatTimeAgo(task.created_at) // "2 minutes ago"
}));
```

### Priority Badge Colors
```javascript
function getBadgeColor(priority) {
  switch(priority) {
    case 1: return '#EF4444'; // Red - STAT
    case 2: return '#F59E0B'; // Orange - HIGH
    case 3: return '#3B82F6'; // Blue - NORMAL
    default: return '#6B7280'; // Gray - LOW
  }
}
```

---

## Search Functionality

### Search Bar Implementation
```javascript
// When user types in search bar
async function searchEquipment(query) {
  const response = await fetch(
    `/api/equipment/search?q=${query}&status=available`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  return response.data; // List of matching equipment
}

// Filter by type when user selects "Wheelchair" or "Bed"
async function filterByType(type) {
  const response = await fetch(
    `/api/equipment/nearby?type=${type}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  return response.data;
}
```

---

## Test Accounts

Default accounts created by schema:

| Role | Employee Code | Password |
|------|--------------|----------|
| Nurse | N001 | 123456 |
| Porter | P001 | 123456 |
| Admin | A001 | admin123 |

---

## Error Handling

All APIs return consistent error format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting & Performance

- Dashboard API combines multiple queries for efficiency
- Use pagination for large lists (add `?limit=20&offset=0`)
- Cache user info and nearby equipment (refresh every 30 seconds)
- Active tasks should update in real-time (WebSocket or polling)

---

## Next Steps

1. **WebSocket/Real-time**: Implement real-time updates for active tasks
2. **Notifications**: Add push notifications for new assignments
3. **Location Tracking**: Implement actual distance calculation (currently uses floor only)
4. **Map Integration**: Add endpoints for map view with equipment locations
5. **Analytics**: Add workload and performance metrics endpoints
