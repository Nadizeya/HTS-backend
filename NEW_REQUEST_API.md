# New Request Screen APIs

## Overview
This document describes all APIs required for the **New Request** screen functionality in the Hospital Transport System mobile app. The screen allows users (nurses primarily) to submit equipment transport requests with location details, priority levels, and additional information.

## Screen Components
The New Request screen includes:
- **Equipment Type Selector**: Toggle between Wheelchair and Bed
- **Priority Level**: Radio buttons for STAT (Emergency), High Priority, or Normal Priority
- **Location Details**: From Location, To Location, and Room/Bay Number
- **Additional Information**: Patient Name (optional), Estimated Duration, Notes
- **Action Buttons**: Clear Form and Submit Request

---

## API Endpoints

### 1. Room Search/Autocomplete
**For location fields: "From Location" and "To Location"**

#### GET /api/rooms/search
Search rooms for autocomplete dropdown in location fields.

**Query Parameters:**
- `q` (required): Search term (minimum 1 character)
- `floor_id` (optional): Filter results by floor ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "ER-101",
      "room_type": "er",
      "display_name": "ER-101 - Ground Floor",
      "floor": "Ground Floor",
      "floor_id": "floor-uuid",
      "zone": "Emergency Zone",
      "building": "Main Building"
    }
  ],
  "count": 20
}
```

**Usage in UI:**
- Called when user types in "From Location" or "To Location" fields
- Returns max 20 results for performance
- Use `display_name` for dropdown display text
- Use `id` value when submitting the request

---

### 2. Get Nearby Rooms
**For quick location selection based on user's current floor**

#### GET /api/rooms/nearby
Get all rooms on the same floor as the current user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ward-201",
      "room_type": "ward",
      "display_name": "Ward-201 - North Zone",
      "floor": "Floor 2",
      "zone": "North Zone"
    }
  ],
  "count": 45
}
```

**Usage in UI:**
- Can be used for "Recent" or "Nearby" quick selection
- Returns rooms on user's current floor only
- Sorted alphabetically by room name

---

### 3. Get All Rooms
**For browsing all available rooms**

#### GET /api/rooms
Get all rooms with optional filters.

**Query Parameters:**
- `floor_id` (optional): Filter by floor
- `zone_id` (optional): Filter by zone
- `room_type` (optional): Filter by type (ward, icu, er, or, radiology, lab, storage, pharmacy, other)
- `search` (optional): Search by room name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "ICU-301",
      "room_type": "icu",
      "zone": {
        "id": "zone-uuid",
        "name": "Critical Care Zone",
        "floor": {
          "id": "floor-uuid",
          "name": "Floor 3",
          "building": "Main Building",
          "level": 3
        }
      }
    }
  ],
  "count": 150
}
```

---

### 4. Check Available Equipment
**Before submitting request, show availability feedback**

#### GET /api/equipment/available
Get count and list of available equipment by type.

**Query Parameters:**
- `type` (optional): Equipment type (wheelchair or bed)
- `floor_id` (optional): Filter by floor

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "equipment_code": "WC-001",
      "type": "wheelchair",
      "battery_level": 85,
      "current_room": {
        "id": "room-uuid",
        "name": "Storage-G01"
      }
    }
  ],
  "count": 5,
  "message": null
}
```

**Response when unavailable:**
```json
{
  "success": true,
  "data": [],
  "count": 0,
  "message": "No available wheelchair found"
}
```

**Usage in UI:**
- Call when equipment type is selected
- Show "5 Wheelchairs Available" or "No beds available - your request will be queued"
- Can update in real-time as user selects type

---

### 5. Create New Request
**Submit the form**

#### POST /api/requests
Create a new transport request.

**Request Body:**
```json
{
  "equipment_type": "wheelchair",
  "priority": 1,
  "pickup_room_id": "uuid",
  "destination_room_id": "uuid",
  "patient_name": "John Doe",
  "estimated_duration_minutes": 30,
  "notes": "Patient needs immediate transfer"
}
```

**Field Validation:**
- `equipment_type` (required): "wheelchair" or "bed"
- `priority` (required): 1 (STAT), 2 (HIGH), or 3 (NORMAL)
- `pickup_room_id` (required): UUID from room search
- `destination_room_id` (required): UUID from room search
- `patient_name` (optional): Patient name
- `estimated_duration_minutes` (optional): Defaults to 30 if not provided
- `notes` (optional): Additional notes

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": "request-uuid",
    "patient_name": "John Doe",
    "priority": 1,
    "pickup_room": {
      "id": "uuid",
      "name": "ER-101",
      "room_type": "er"
    },
    "destination_room": {
      "id": "uuid",
      "name": "Ward-201",
      "room_type": "ward"
    },
    "equipment_type": "wheelchair",
    "status": "pending",
    "estimated_duration_minutes": 30,
    "notes": "Patient needs immediate transfer",
    "created_at": "2026-02-15T03:58:00Z"
  }
}
```

**Response (Validation Error - 400):**
```json
{
  "success": false,
  "message": "Missing required fields: priority, pickup_room_id, destination_room_id, equipment_type"
}
```

**Response (Invalid Priority - 400):**
```json
{
  "success": false,
  "message": "Priority must be 1 (STAT), 2 (HIGH), or 3 (NORMAL)"
}
```

---

## UI Implementation Flow

### Component Loading Sequence
1. **Screen Mount:**
   - Load floors list (if implementing floor filter): `GET /api/floors`
   - Pre-fetch nearby rooms: `GET /api/rooms/nearby`
   
2. **Equipment Type Selection:**
   - User taps "Wheelchair" or "Bed"
   - Call `GET /api/equipment/available?type=wheelchair` (or bed)
   - Show availability feedback: "12 Wheelchairs Available" badge

3. **Location Field Input:**
   - User types in "From Location" or "To Location"
   - Debounce input (300ms)
   - Call `GET /api/rooms/search?q=<input>`
   - Display autocomplete dropdown with `display_name`
   - On selection, store `id` value

4. **Priority Selection:**
   - User selects priority radio button
   - Store priority value: 1, 2, or 3
   - Update UI badge color (red/orange/blue)

5. **Form Submission:**
   - Validate all required fields locally
   - Show confirmation if priority is STAT: "This is an emergency request. Confirm?"
   - Call `POST /api/requests` with form data
   - On success: Show success message, navigate to task detail or home screen
   - On error: Show error message, keep form data

6. **Clear Form:**
   - Reset all fields to default
   - Equipment Type: Wheelchair
   - Priority: Normal (3)
   - Estimated Duration: 30 minutes
   - Clear all text fields

---

## Field Mapping Reference

| UI Component | API Field | Values | Required |
|--------------|-----------|--------|----------|
| Equipment Type Toggle | `equipment_type` | "wheelchair" \| "bed" | Yes |
| STAT Radio | `priority` | 1 | Yes |
| High Priority Radio | `priority` | 2 | Yes |
| Normal Priority Radio | `priority` | 3 | Yes |
| From Location Field | `pickup_room_id` | UUID | Yes |
| To Location Field | `destination_room_id` | UUID | Yes |
| Patient Name Field | `patient_name` | String | No |
| Estimated Duration | `estimated_duration_minutes` | Integer (default: 30) | No |
| Notes Field | `notes` | String | No |

---

## Priority Badge Styling

```javascript
const priorityConfig = {
  1: { label: "URGENT", color: "#EF4444", bgColor: "#FEE2E2" }, // Red - STAT
  2: { label: "HIGH", color: "#F97316", bgColor: "#FFEDD5" },   // Orange - High
  3: { label: "NORMAL", color: "#3B82F6", bgColor: "#DBEAFE" }, // Blue - Normal
};
```

---

## Request Tips Implementation

Display the tips box content:
```javascript
const requestTips = [
  "STAT requests are for emergencies only",
  "Be specific with location details",
  "Include patient name for faster processing",
  "Estimated duration helps with planning"
];
```

---

## Error Handling

### Network Errors
```javascript
try {
  const response = await fetch('/api/requests', { method: 'POST', ... });
  if (!response.ok) {
    const error = await response.json();
    showError(error.message);
  }
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

### Common Error Messages
- "Missing required fields: ..." - User didn't fill required fields
- "Priority must be 1 (STAT), 2 (HIGH), or 3 (NORMAL)" - Invalid priority value
- "Equipment type must be 'wheelchair' or 'bed'" - Invalid equipment type
- "No available wheelchair found" - No equipment available (show as warning, not error)

---

## Testing Endpoints

Test the complete New Request flow using these steps:

```http
### Step 1: Login as Nurse
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "employeecode": "N001",
  "password": "123456"
}
# Save the token from response

### Step 2: Search for rooms (From Location)
GET http://localhost:3000/api/rooms/search?q=ER
Authorization: Bearer <token>

### Step 3: Search for rooms (To Location)
GET http://localhost:3000/api/rooms/search?q=Ward
Authorization: Bearer <token>

### Step 4: Check available wheelchairs
GET http://localhost:3000/api/equipment/available?type=wheelchair
Authorization: Bearer <token>

### Step 5: Submit request
POST http://localhost:3000/api/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "equipment_type": "wheelchair",
  "priority": 2,
  "pickup_room_id": "<from step 2>",
  "destination_room_id": "<from step 3>",
  "patient_name": "John Doe",
  "estimated_duration_minutes": 30,
  "notes": "Patient requires assistance"
}
```

---

## Performance Recommendations

1. **Autocomplete Debouncing**: Wait 300ms after user stops typing before calling search API
2. **Cache Nearby Rooms**: Cache result from `/api/rooms/nearby` for 5 minutes
3. **Equipment Availability**: Refresh every 30 seconds while form is open
4. **Optimistic UI**: Show form submission immediately, handle errors asynchronously
5. **Input Validation**: Validate fields client-side before submission to reduce server errors

---

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <access_token>
```

Test accounts:
- Nurse: N001 / 123456
- Porter: P001 / 123456
- Admin: A001 / admin123
