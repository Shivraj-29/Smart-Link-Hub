# Smart Link Hub - API Documentation

Base URL: `https://smart-link-hub-api.onrender.com`

## Authentication

All protected endpoints require an `Authorization` header with the user ID:

```
Authorization: Bearer <user_id>
```

---

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Email already registered"
}
```

---

#### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

---

### Hubs

#### List All Hubs
```http
GET /api/hubs
Authorization: Bearer <user_id>
```

**Response (200 OK):**
```json
{
  "hubs": [
    {
      "id": "hub-uuid",
      "title": "My Links",
      "slug": "my-links",
      "description": "My personal link page",
      "theme": "default",
      "linkCount": 5,
      "clickCount": 150,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "totalClicks": 150,
  "totalLinks": 5
}
```

---

#### Create Hub
```http
POST /api/hubs
Authorization: Bearer <user_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "My Links",
  "slug": "my-links",
  "description": "My personal link page",
  "theme": "default",
  "links": [
    {
      "title": "My Website",
      "url": "https://example.com",
      "icon": "🌐",
      "position": 0,
      "isActive": true,
      "rules": [
        {
          "type": "time",
          "config": { "startHour": 9, "endHour": 17 }
        }
      ]
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "hub": {
    "id": "new-hub-uuid",
    "slug": "my-links",
    "title": "My Links",
    "description": "My personal link page",
    "theme": "default"
  }
}
```

---

#### Get Hub Details
```http
GET /api/hubs/:id
Authorization: Bearer <user_id>
```

**Response (200 OK):**
```json
{
  "hub": {
    "id": "hub-uuid",
    "title": "My Links",
    "slug": "my-links",
    "description": "Description",
    "theme": "default",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "links": [
    {
      "id": "link-uuid",
      "title": "My Website",
      "url": "https://example.com",
      "icon": "🌐",
      "position": 0,
      "isActive": true,
      "rules": [
        {
          "id": "rule-uuid",
          "type": "time",
          "config": { "startHour": 9, "endHour": 17 }
        }
      ]
    }
  ]
}
```

---

#### Update Hub
```http
PUT /api/hubs/:id
Authorization: Bearer <user_id>
Content-Type: application/json
```

**Request Body:** Same as Create Hub

**Response (200 OK):**
```json
{
  "hub": {
    "id": "hub-uuid",
    "slug": "updated-slug",
    "title": "Updated Title",
    "description": "Updated description",
    "theme": "midnight"
  }
}
```

---

#### Delete Hub
```http
DELETE /api/hubs/:id
Authorization: Bearer <user_id>
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

#### Generate QR Code
```http
GET /api/hubs/:id/qr
Authorization: Bearer <user_id>
```

**Query Parameters:**
- `format` - `png` (default) or `svg`
- `size` - Width in pixels (default: 300)

**Response (200 OK) - PNG format:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "url": "https://smart-link-hub.onrender.com/h/my-links"
}
```

**Response (200 OK) - SVG format:**
```xml
<svg>...</svg>
```

---

### Public Hub Access

#### Get Public Hub
```http
GET /api/public/:slug
```

**Query Parameters:**
- `device` - `desktop`, `mobile`, or `tablet` (for device-based rules)

**Response (200 OK):**
```json
{
  "hub": {
    "title": "My Links",
    "description": "My personal link page",
    "theme": "default",
    "slug": "my-links"
  },
  "links": [
    {
      "id": "link-uuid",
      "title": "My Website",
      "url": "https://example.com",
      "icon": "🌐"
    }
  ]
}
```

> Note: Links are filtered based on active rules (time, device)

---

### Analytics

#### Track Event
```http
POST /api/analytics/track
Content-Type: application/json
```

**Request Body:**
```json
{
  "slug": "my-links",
  "linkId": "link-uuid",  // optional, for click events
  "eventType": "visit",   // or "click"
  "deviceType": "desktop",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

#### Get Analytics
```http
GET /api/analytics/:hubId
Authorization: Bearer <user_id>
```

**Query Parameters:**
- `range` - `24h`, `7d`, `30d`, or `all`

**Response (200 OK):**
```json
{
  "totalViews": 500,
  "totalClicks": 125,
  "linkStats": [
    {
      "id": "link-uuid",
      "title": "My Website",
      "url": "https://example.com",
      "icon": "🌐",
      "clicks": 50
    }
  ],
  "deviceBreakdown": [
    { "type": "desktop", "count": 300 },
    { "type": "mobile", "count": 175 },
    { "type": "tablet", "count": 25 }
  ],
  "dailyStats": [
    { "date": "2024-01-15", "views": 100, "clicks": 25, "label": "Mon" }
  ]
}
```

---

#### Export Analytics
```http
GET /api/analytics/:hubId/export
Authorization: Bearer <user_id>
```

**Query Parameters:**
- `format` - `json` (default) or `csv`
- `range` - `24h`, `7d`, `30d`, or `all`

**Response (200 OK) - JSON:**
```json
{
  "hub": { "title": "...", "slug": "..." },
  "timeRange": "7d",
  "generatedAt": "2024-01-15T10:30:00Z",
  "summary": {
    "totalViews": 500,
    "totalClicks": 125,
    "clickRate": "25.0"
  },
  "linkPerformance": [...],
  "events": [...]
}
```

**Response (200 OK) - CSV:**
```csv
Smart Link Hub Analytics Report
Hub: My Links
...
```

---

## Data Models

### User
```typescript
{
  id: string,
  email: string,
  password: string (hashed),
  name: string,
  created_at: timestamp
}
```

### Hub
```typescript
{
  id: string,
  user_id: string,
  slug: string (unique),
  title: string,
  description: string,
  theme: 'default' | 'midnight' | 'ocean' | 'sunset',
  created_at: timestamp
}
```

### Link
```typescript
{
  id: string,
  hub_id: string,
  title: string,
  url: string,
  icon: string (emoji),
  position: number,
  is_active: boolean,
  created_at: timestamp
}
```

### Rule
```typescript
{
  id: string,
  link_id: string,
  rule_type: 'time' | 'device' | 'location',
  rule_config: {
    // For time rule
    startHour: number (0-23),
    endHour: number (0-23),
    
    // For device rule
    devices: ['desktop', 'mobile', 'tablet'],
    
    // For location rule
    countries: ['US', 'UK', ...]
  }
}
```

### Analytics Event
```typescript
{
  id: string,
  hub_id: string,
  link_id: string (optional),
  event_type: 'visit' | 'click',
  device_type: 'desktop' | 'mobile' | 'tablet',
  location: string,
  timestamp: timestamp
}
```

---

## Error Responses

All errors return JSON in this format:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
