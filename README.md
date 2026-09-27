# ⚡ Smart Link Hub

> A production-ready full-stack smart link management platform that allows users to create personalized link hubs, apply dynamic display rules based on time, device, and location, track analytics, and generate QR codes for sharing.

![Smart Link Hub](screenshots/landing.png)

---

## 📌 Overview

**Smart Link Hub** is a full-stack web application inspired by platforms such as Linktree.

Instead of sharing multiple links separately, users can create a single personalized public URL containing all their important links.

The main difference is that Smart Link Hub supports **dynamic link display rules**.

A link can be configured to appear only:

* During specific hours
* On specific devices
* In specific countries

The application also provides an analytics dashboard where users can monitor:

* Total page views
* Total link clicks
* Device usage
* Link performance
* Daily views and clicks
* Click-through rate
* Exportable analytics reports

Users can also generate QR codes for their public link hubs.

---

# 🎯 Problem Statement

People such as developers, students, content creators, businesses, and professionals often have multiple online resources:

* Portfolio
* LinkedIn
* GitHub
* Resume
* YouTube
* Instagram
* Company website
* Products
* Contact information

Sharing all these URLs separately is inconvenient.

Traditional link-in-bio platforms provide a single page containing links, but Smart Link Hub adds **rule-based dynamic link visibility** and detailed analytics.

---

# 💡 Solution

Smart Link Hub provides a centralized platform where users can:

1. Create an account.
2. Create a personalized link hub.
3. Add multiple links.
4. Configure smart visibility rules.
5. Publish the hub using a unique URL.
6. Share the URL or QR code.
7. Track visitors and link clicks.
8. Analyze user behavior.
9. Export analytics data.

Example:

```text
https://your-domain.com/h/my-links
```

The same public link can show different links depending on the visitor.

Example:

```text
Time Rule:
9 AM - 5 PM
→ Show "Book a Meeting"

Device Rule:
Mobile
→ Show "Download Mobile App"

Location Rule:
India
→ Show "Indian Store"

Desktop
→ Show "Desktop Dashboard"
```

---

# ✨ Features

## 👤 Authentication

Users can:

* Register
* Login
* Logout
* Maintain authenticated sessions
* Access only their own hubs
* Use JWT-based authentication

Passwords are securely hashed using **bcryptjs**.

Authentication tokens are signed using **JSON Web Tokens (JWT)**.

JWT tokens expire after 7 days.

---

# 🔗 Link Hub Management

Users can create and manage multiple link hubs.

Each hub contains:

* Title
* Description
* Unique slug
* Theme
* Multiple links
* Link icons
* Link ordering
* Active/inactive status
* Smart rules

Example:

```text
My Portfolio

├── GitHub
├── LinkedIn
├── Portfolio
├── Resume
├── YouTube
└── Contact Me
```

---

# 🧠 Smart Display Rules

One of the main features of this project is the **Smart Rules Engine**.

Links can be displayed conditionally.

## 1. Time-Based Rules

A link can be displayed only during a specific time period.

Example:

```text
Start: 09:00
End:   17:00
```

The link is visible only during those hours.

Use case:

```text
"Book a Meeting"

Available:
9 AM → 5 PM

Hidden:
5 PM → 9 AM
```

---

## 2. Device-Based Rules

Links can be displayed depending on the visitor's device.

Supported devices:

```text
Desktop
Mobile
Tablet
```

The backend detects the visitor's device using the HTTP `User-Agent`.

Example:

```text
Mobile → Show "Download App"
Desktop → Show "Open Dashboard"
Tablet → Show "Tablet Version"
```

---

## 3. Location-Based Rules

Links can be displayed based on the visitor's country.

The application uses:

```text
geoip-lite
```

for offline IP-to-country lookup.

Example:

```text
India → Indian Store
US → US Store
UK → UK Store
```

Location detection is best-effort because local development IPs, VPNs, and some proxy configurations may not resolve to a country.

---

# 📊 Analytics Dashboard

The application tracks visitor activity.

Analytics include:

### Total Views

Number of times the public hub was visited.

### Total Clicks

Number of times visitors clicked links.

### Device Breakdown

Example:

```text
Desktop   60%
Mobile    30%
Tablet    10%
```

### Daily Statistics

The dashboard displays:

```text
Date
Views
Clicks
```

### Link Performance

Each link displays:

* Number of clicks
* CTR
* Relative performance

---

# 📈 Analytics Export

Analytics can be exported in:

```text
JSON
CSV
```

Example CSV report:

```text
Smart Link Hub Analytics Report

SUMMARY

Total Views
Total Clicks
Click Rate

LINK PERFORMANCE

Link Title
URL
Clicks

DETAILED EVENTS

Timestamp
Event Type
Device
Link Title
Link URL
```

CSV values are properly escaped so titles containing quotation marks do not corrupt the generated CSV.

---

# 📱 QR Code Generation

Users can generate a QR code for their public hub.

Example:

```text
Public Hub
     ↓
QR Code
     ↓
Scan using phone
     ↓
Open Smart Link Hub
```

QR codes can be generated as:

```text
PNG
SVG
```

The QR code points to:

```text
/h/{slug}
```

---

# 🎨 Custom Themes

The public link hub supports multiple themes.

Available themes include:

```text
Default
Midnight
Ocean
Sunset
```

Each theme changes the visual appearance of the public hub.

---

# 🔐 Production-Ready Security

This version contains several security improvements.

## Password Hashing

Passwords are hashed using:

```text
bcryptjs
```

instead of storing reversible values.

---

## JWT Authentication

Authentication uses:

```text
jsonwebtoken
```

JWT tokens contain the user ID and expire after 7 days.

---

## Rate Limiting

The application uses:

```text
express-rate-limit
```

Authentication endpoints are limited to:

```text
20 requests / 15 minutes / IP
```

The general API has a baseline limit of:

```text
120 requests / minute / IP
```

---

## Helmet

The project uses:

```text
helmet
```

to add common security-related HTTP headers.

---

## CORS Protection

CORS supports an explicit list of allowed frontend origins.

Example:

```env
FRONTEND_URL=https://example.com,https://www.example.com
```

---

## Input Validation

The backend validates:

* Email format
* Password length
* Hub slug
* URL format
* Required fields

Backend validation is important because frontend validation can be bypassed using tools such as Postman or cURL.

---

## SQL Injection Protection

The application uses parameterized PostgreSQL queries.

Example:

```javascript
await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
)
```

User input is passed separately from the SQL statement.

---

# 🏗️ Architecture

The application follows a simple full-stack architecture.

```text
                 ┌──────────────────────┐
                 │       Browser        │
                 │      React App       │
                 └──────────┬───────────┘
                            │
                            │ HTTP / REST API
                            ▼
                 ┌──────────────────────┐
                 │      Express.js      │
                 │       Backend        │
                 └──────────┬───────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        PostgreSQL       JWT Auth       Smart Rules
             │                             │
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                       Analytics
```

---

# 🛠️ Tech Stack

## Frontend

| Technology       | Purpose             |
| ---------------- | ------------------- |
| React 18         | Building UI         |
| Vite             | Frontend build tool |
| React Router DOM | Client-side routing |
| Vanilla CSS      | Styling             |
| JavaScript       | Application logic   |

---

## Backend

| Technology         | Purpose                       |
| ------------------ | ----------------------------- |
| Node.js            | JavaScript runtime            |
| Express.js         | REST API server               |
| JWT                | Authentication                |
| bcryptjs           | Password hashing              |
| Helmet             | Security headers              |
| CORS               | Cross-origin request handling |
| express-rate-limit | Rate limiting                 |
| compression        | Response compression          |
| uuid               | Unique IDs                    |

---

## Database

```text
PostgreSQL
```

The project uses the Node PostgreSQL driver:

```text
pg
```

The application uses a PostgreSQL connection pool for efficient database connections.

No ORM is used.

The project directly uses parameterized SQL queries.

---

## Additional Technologies

| Technology      | Purpose                     |
| --------------- | --------------------------- |
| qrcode          | QR code generation          |
| geoip-lite      | IP-to-country detection     |
| dotenv          | Environment variables       |
| Docker          | Containerization            |
| Docker Compose  | Local multi-container setup |
| AWS RDS         | Production PostgreSQL       |
| AWS ECS Fargate | Container deployment        |
| AWS ALB         | Load balancing              |
| Render          | Alternative deployment      |

---

# 📁 Project Structure

```text
Smart-Link/
│
├── server/
│   └── index.js
│       ├── Express server
│       ├── PostgreSQL connection
│       ├── Database initialization
│       ├── Authentication
│       ├── Hub APIs
│       ├── Smart rule engine
│       ├── Analytics APIs
│       ├── QR generation
│       ├── Security middleware
│       └── Production server configuration
│
├── src/
│   │
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── HubEditor.jsx
│   │   ├── Analytics.jsx
│   │   └── PublicHub.jsx
│   │
│   ├── App.jsx
│   │
│   ├── api.js
│   │
│   ├── main.jsx
│   │
│   └── index.css
│
├── public/
│   └── link-icon.svg
│
├── screenshots/
│   ├── landing.png
│   ├── dashboard.png
│   └── hub-created.png
│
├── docs/
│   ├── API.md
│   └── DEPLOYMENT-AWS.md
│
├── Dockerfile
├── docker-compose.yml
├── vite.config.js
├── package.json
├── package-lock.json
├── .env.example
├── .dockerignore
├── CHANGES.md
└── README.md
```

---

# 📂 Important Files Explained

## `server/index.js`

This is the main backend file.

It contains:

* Express configuration
* PostgreSQL connection
* Database initialization
* Authentication
* JWT verification
* Hub CRUD APIs
* Public hub API
* Smart rules engine
* Analytics
* QR generation
* CSV export
* Health check
* Security middleware
* Graceful shutdown

---

## `src/App.jsx`

Main React application file.

It handles:

* Application routing
* User state
* Authentication state
* Protected routes
* Toast notifications
* Shared application context

---

## `src/api.js`

Contains the API URL configuration used by the frontend.

It allows the application to communicate with the backend.

---

## `src/main.jsx`

React entry point.

It mounts the React application to the DOM.

---

## `src/index.css`

Contains global styling including:

* Colors
* Typography
* Buttons
* Cards
* Forms
* Tables
* Layout utilities
* Animations
* Hub themes
* Responsive styles

---

# 📄 Frontend Pages

## `Landing.jsx`

The public landing/marketing page.

It explains the application and provides access to login/signup.

---

## `Login.jsx`

Handles:

```text
Login
Registration
Authentication errors
JWT storage
Navigation
```

---

## `Dashboard.jsx`

Main authenticated dashboard.

Users can:

* View hubs
* Create hubs
* Manage hubs
* See link counts
* See click counts
* Open analytics
* Edit hubs

---

## `HubEditor.jsx`

Used to create and edit hubs.

Users can configure:

```text
Hub title
Slug
Description
Theme
Links
Icons
Ordering
Active status
Rules
```

---

## `Analytics.jsx`

Displays analytics for a hub.

Includes:

```text
Views
Clicks
CTR
Daily statistics
Device breakdown
Link performance
```

It also supports analytics export.

---

## `PublicHub.jsx`

Displays the public-facing link page.

Example:

```text
/h/my-links
```

It:

1. Fetches the public hub.
2. Displays hub information.
3. Displays filtered links.
4. Tracks visits.
5. Tracks link clicks.
6. Opens links in a new tab.

---

# 🔄 Application Flow

## Registration Flow

```text
User
 ↓
Registration Form
 ↓
POST /api/auth/register
 ↓
Validate Input
 ↓
Hash Password using bcrypt
 ↓
Store User in PostgreSQL
 ↓
Generate JWT
 ↓
Return User + Token
 ↓
Frontend stores authentication state
 ↓
Dashboard
```

---

# 🔐 Login Flow

```text
User
 ↓
Login Form
 ↓
POST /api/auth/login
 ↓
Find user by email
 ↓
Compare password with bcrypt
 ↓
Generate JWT
 ↓
Return token
 ↓
Frontend stores token
 ↓
Authenticated requests
```

---

# 🔑 JWT Request Flow

For protected APIs, the frontend sends:

```http
Authorization: Bearer <JWT_TOKEN>
```

The backend:

```text
Request
 ↓
Read Authorization Header
 ↓
Extract JWT
 ↓
Verify JWT
 ↓
Get User ID
 ↓
Find User in Database
 ↓
Attach User to req.user
 ↓
Continue Request
```

If the token is invalid or expired:

```http
401 Unauthorized
```

is returned.

---

# 🔗 Hub Creation Flow

```text
User
 ↓
Hub Editor
 ↓
Enter title / slug / links
 ↓
POST /api/hubs
 ↓
Validate input
 ↓
Check slug uniqueness
 ↓
Create Hub
 ↓
Create Links
 ↓
Create Rules
 ↓
PostgreSQL
 ↓
Return Hub
```

---

# 🧠 Smart Rules Flow

When a visitor opens:

```text
/h/my-links
```

the frontend requests:

```http
GET /api/public/my-links
```

The backend:

```text
Find Hub
 ↓
Find Active Links
 ↓
Load Rules
 ↓
Detect Device
 ↓
Detect Current Time
 ↓
Detect Visitor Country
 ↓
Evaluate Rules
 ↓
Filter Links
 ↓
Return Visible Links
```

Only links satisfying their configured rules are returned.

---

# 📊 Analytics Flow

## Visit

```text
Visitor opens public hub
        ↓
PublicHub.jsx
        ↓
POST /api/analytics/track
        ↓
eventType = visit
        ↓
PostgreSQL
```

## Click

```text
Visitor clicks link
        ↓
trackClick()
        ↓
POST /api/analytics/track
        ↓
eventType = click
        ↓
PostgreSQL
```

## Dashboard

```text
Analytics Page
      ↓
GET /api/analytics/:hubId
      ↓
PostgreSQL queries
      ↓
Views
Clicks
Device data
Daily data
Link performance
      ↓
Analytics Dashboard
```

---

# 🗄️ Database Design

The application uses five main tables:

```text
users
hubs
links
rules
analytics
```

---

## Users Table

```text
users
│
├── id
├── email
├── password
├── name
└── created_at
```

---

## Hubs Table

```text
hubs
│
├── id
├── user_id
├── slug
├── title
├── description
├── theme
└── created_at
```

Relationship:

```text
User
  │
  └── Multiple Hubs
```

---

## Links Table

```text
links
│
├── id
├── hub_id
├── title
├── url
├── icon
├── position
├── is_active
└── created_at
```

Relationship:

```text
Hub
 │
 └── Multiple Links
```

---

## Rules Table

```text
rules
│
├── id
├── link_id
├── rule_type
└── rule_config
```

Possible rule types:

```text
time
device
location
```

---

## Analytics Table

```text
analytics
│
├── id
├── hub_id
├── link_id
├── event_type
├── device_type
├── location
└── timestamp
```

Possible event types:

```text
visit
click
```

---

# 🔗 Database Relationships

```text
USER
 │
 ├───────────────┐
 │               │
 ▼               ▼
HUB 1           HUB 2
 │
 ├── LINK 1
 │    ├── RULE
 │    └── RULE
 │
 ├── LINK 2
 │    └── RULE
 │
 └── LINK 3

HUB
 │
 └── ANALYTICS EVENTS
```

Foreign key relationships use cascading deletes where appropriate.

For example:

```text
Delete Hub
   ↓
Delete Links
   ↓
Delete Rules
   ↓
Delete Analytics
```

---

# 🌐 API Documentation

Detailed API documentation is available in:

```text
docs/API.md
```

---

# 🔐 Authentication APIs

## Register

```http
POST /api/auth/register
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "JWT_TOKEN"
}
```

---

## Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

# 🔗 Hub APIs

| Method | Endpoint           | Purpose         |
| ------ | ------------------ | --------------- |
| GET    | `/api/hubs`        | Get user's hubs |
| POST   | `/api/hubs`        | Create hub      |
| GET    | `/api/hubs/:id`    | Get hub         |
| PUT    | `/api/hubs/:id`    | Update hub      |
| DELETE | `/api/hubs/:id`    | Delete hub      |
| GET    | `/api/hubs/:id/qr` | Generate QR     |

Protected endpoints require JWT authentication.

---

# 🌍 Public Hub API

```http
GET /api/public/:slug
```

Example:

```http
GET /api/public/my-links
```

This endpoint does not require authentication.

It returns only links that satisfy their smart rules.

---

# 📊 Analytics APIs

## Track Event

```http
POST /api/analytics/track
```

Example:

```json
{
  "slug": "my-links",
  "linkId": "link-id",
  "eventType": "click",
  "deviceType": "mobile",
  "timestamp": "2026-09-27T10:30:00Z"
}
```

---

## Get Analytics

```http
GET /api/analytics/:hubId
```

Supported ranges:

```text
24h
7d
30d
all
```

---

## Export Analytics

```http
GET /api/analytics/:hubId/export
```

Supported formats:

```text
JSON
CSV
```

---

# ❤️ Health Check

The backend provides:

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "timestamp": "2026-09-27T10:30:00.000Z"
}
```

This endpoint can be used by:

* AWS ALB
* ECS
* Docker
* Monitoring systems

to check whether the application and database are healthy.

---

# ⚙️ Environment Variables

Create a `.env` file using:

```bash
cp .env.example .env
```

Then configure:

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartlinkhub

JWT_SECRET=your-long-random-secret

FRONTEND_URL=http://localhost:5173

VITE_API_URL=
```

---

# 📝 Environment Variable Explanation

| Variable       | Purpose                                    |
| -------------- | ------------------------------------------ |
| `NODE_ENV`     | Application environment                    |
| `PORT`         | Backend server port                        |
| `DATABASE_URL` | PostgreSQL connection string               |
| `JWT_SECRET`   | Secret used for signing JWTs               |
| `FRONTEND_URL` | Allowed frontend origins                   |
| `VITE_API_URL` | Backend API URL used by frontend           |
| `PUBLIC_URL`   | Optional public URL used for QR generation |
| `DB_POOL_MAX`  | Optional PostgreSQL pool size              |

---

# 💻 Local Development

## Prerequisites

Install:

```text
Node.js 20+
PostgreSQL
Git
```

Docker can also be used instead of installing PostgreSQL manually.

---

# 🚀 Installation

## 1. Clone Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Smart-Link
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment

```bash
cp .env.example .env
```

Update:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartlinkhub
JWT_SECRET=your-secret
```

---

# 🗄️ PostgreSQL Setup

Create a database:

```sql
CREATE DATABASE smartlinkhub;
```

The application automatically creates the required tables when the backend starts.

No separate migration command is required.

Tables created automatically:

```text
users
hubs
links
rules
analytics
```

---

# ▶️ Run Backend

```bash
npm run server
```

Backend runs on:

```text
http://localhost:3001
```

---

# ▶️ Run Frontend

Open another terminal:

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# 🌐 Vite Development Proxy

During development, Vite proxies:

```text
/api
```

to:

```text
http://localhost:3001
```

This configuration is defined in:

```text
vite.config.js
```

---

# 🐳 Docker Setup

The project includes a production-ready Dockerfile.

Build:

```bash
docker build -t smart-link .
```

Run:

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_SECRET="your-secret" \
  smart-link
```

---

# 🐳 Docker Compose

For local development with PostgreSQL:

```bash
docker compose up --build
```

This starts:

```text
PostgreSQL
     +
Smart Link Application
```

PostgreSQL runs on:

```text
5432
```

Application runs on:

```text
3001
```

---

# 🏭 Production Docker Architecture

The Dockerfile uses a multi-stage build.

```text
Stage 1
Node.js
   ↓
Install dependencies
   ↓
Build React/Vite application
   ↓
dist/

Stage 2
Node.js Alpine
   ↓
Install production dependencies
   ↓
Copy Express server
   ↓
Copy frontend dist
   ↓
Run as non-root user
```

This creates a smaller production image and separates the frontend build environment from the runtime environment.

---

# ☁️ AWS Deployment

Detailed deployment instructions are available in:

```text
docs/DEPLOYMENT-AWS.md
```

The project supports:

```text
AWS ECS Fargate + RDS
```

or:

```text
AWS EC2 + RDS
```

---

# ☁️ AWS Architecture

Recommended architecture:

```text
                 Internet
                    │
                    ▼
              Route 53
                    │
                    ▼
              HTTPS / ACM
                    │
                    ▼
          Application Load Balancer
                    │
                    ▼
              ECS Fargate
                    │
                    ▼
             Smart Link App
                    │
                    ▼
              AWS RDS
             PostgreSQL
```

---

# 🗃️ AWS RDS

PostgreSQL is hosted using:

```text
AWS RDS
```

The application connects using:

```env
DATABASE_URL
```

The database should remain private and should only accept connections from the application's security group.

---

# 🚢 AWS ECS Fargate

The application can run as a Docker container using:

```text
AWS ECS Fargate
```

The container exposes:

```text
3001
```

The ALB forwards traffic to the container.

Health check:

```text
/api/health
```

---

# 🔒 Production Configuration

For production:

```env
NODE_ENV=production
DATABASE_URL=<AWS-RDS-DATABASE-URL>
JWT_SECRET=<STRONG-RANDOM-SECRET>
FRONTEND_URL=https://your-domain.com
PORT=3001
```

Never commit:

```text
.env
```

to GitHub.

---

# 🔑 Generate JWT Secret

A strong JWT secret can be generated using:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

# 🛡️ Graceful Shutdown

The backend handles:

```text
SIGTERM
SIGINT
```

During shutdown:

```text
Stop accepting new requests
        ↓
Allow active requests to finish
        ↓
Close PostgreSQL pool
        ↓
Exit process
```

This is useful for containerized deployments such as ECS.

---

# 📦 NPM Scripts

Available commands:

```bash
npm run dev
```

Starts Vite development server.

```bash
npm run build
```

Builds the React frontend.

```bash
npm run preview
```

Previews the production frontend build.

```bash
npm run server
```

Starts the Express backend.

```bash
npm start
```

Starts the application in production mode.

```bash
npm run render-build
```

Build command for Render deployment.

---

# 🧪 Current Testing / Validation

The project has been verified around the following areas:

* User registration
* User login
* Password hashing
* JWT authentication
* Hub creation
* Hub editing
* Hub deletion
* Link management
* Time-based rules
* Device-based rules
* Location-based rules
* Analytics tracking
* Analytics dashboard
* QR generation
* CSV export
* PostgreSQL connectivity
* Docker deployment configuration
* AWS health check
* Graceful shutdown

---

# 🔧 Production Improvements

The production-ready version includes several important fixes.

## 1. Password Security

Previous reversible password storage was replaced with:

```text
bcryptjs
```

---

## 2. Secure Authentication

Raw user IDs are no longer used as authentication tokens.

The application now uses:

```text
JWT
```

with expiration.

---

## 3. CORS Fix

Instead of unrestricted CORS:

```text
*
```

the application supports an explicit origin allow-list.

---

## 4. Rate Limiting

Rate limiting was added to prevent excessive requests.

---

## 5. Security Headers

Added:

```text
Helmet
```

---

## 6. Server-Side Validation

Input validation is performed on the backend instead of relying only on frontend validation.

---

## 7. Device Rules Fix

Device type is detected from the request's `User-Agent`.

Supported:

```text
Desktop
Mobile
Tablet
```

---

## 8. Analytics History Fix

When a hub is edited, existing link IDs are preserved.

This prevents old analytics records from losing their connection to the edited links.

---

## 9. Location Rules

Location rules are enforced server-side using:

```text
geoip-lite
```

---

## 10. CSV Export Fix

CSV values are properly escaped, including values containing quotation marks.

---

# 🔄 Hub Update Strategy

An important implementation detail is that editing a hub does not simply delete and recreate all links.

Existing links are updated while preserving their IDs.

Example:

```text
Before:

Link ID: ABC123
Title: GitHub
Clicks: 100


User edits title:

GitHub → My GitHub


After:

Link ID: ABC123
Title: My GitHub
Clicks: 100
```

This preserves analytics history.

---

# 📌 Why PostgreSQL?

PostgreSQL was selected because the application contains structured relationships:

```text
User
 ↓
Hubs
 ↓
Links
 ↓
Rules
```

and:

```text
Hub
 ↓
Analytics Events
```

A relational database makes these relationships and queries straightforward.

PostgreSQL also provides:

* Foreign keys
* Transactions
* Aggregation
* Indexes
* Reliable structured storage
* SQL analytics queries

---

# 📌 Why Raw SQL Instead of an ORM?

The project uses:

```text
pg
```

directly rather than Prisma, Sequelize, or another ORM.

Parameterized SQL queries provide:

* Direct control over queries
* Simple database interaction
* Efficient aggregation queries
* No additional ORM abstraction

---

# 📌 Why React + Vite?

React is used to create reusable UI components and manage frontend state.

Vite provides:

* Fast development server
* Fast build process
* Simple configuration
* Modern frontend development workflow

---

# 📌 Why Express.js?

Express provides a lightweight way to build the REST API.

The backend handles:

```text
Authentication
CRUD operations
Business logic
Rules
Analytics
QR generation
Database communication
```

---

# 📌 Why JWT?

JWT provides stateless authentication.

The server signs a token:

```text
User ID
+
Secret
+
Expiration
```

The frontend sends the token with protected API requests.

The backend verifies the token before allowing access.

---

# 📌 Why bcrypt?

Passwords should never be stored as plain text.

bcrypt performs one-way password hashing.

Example:

```text
Password:
hello123

        ↓ bcrypt

$2b$10$....
```

The original password cannot simply be reversed from the stored hash.

---

# 📌 Why UUID?

UUIDs are used for entities such as:

```text
Users
Hubs
Links
Rules
Analytics events
```

Example:

```text
550e8400-e29b-41d4-a716-446655440000
```

This provides unique identifiers without relying on sequential numeric IDs.

---

# 📌 Why geoip-lite?

Location-based rules need an IP-to-country lookup.

`geoip-lite` provides an offline lookup database, meaning the application does not need to call an external geolocation API for every visitor.

---

# 📌 Why QRCode?

The `qrcode` package generates QR codes directly from the backend.

A hub URL can be converted into:

```text
PNG
```

or:

```text
SVG
```

---

# 🚨 Important Limitations

## Location Detection

IP-based location detection is not always perfect.

It may be inaccurate for:

* VPN users
* Local development
* Proxy networks
* Some cloud environments

---

## Analytics

Analytics are application-level events.

They should not be considered equivalent to enterprise-grade analytics platforms.

---

## No Automated Migration System

The current application creates tables using:

```sql
CREATE TABLE IF NOT EXISTS
```

during startup.

A dedicated migration system could be added in a future version.

---

# 🚀 Possible Future Improvements

Potential future features include:

* Google/GitHub OAuth login
* Password reset
* Email verification
* Custom domains
* More themes
* Link scheduling
* A/B testing
* Advanced analytics
* Real-time analytics
* Click heatmaps
* Link expiration
* Social media preview cards
* Custom profile images
* Custom CSS
* Drag-and-drop improvements
* Redis caching
* Background analytics processing
* Automated database migrations
* Automated test suite
* CI/CD using GitHub Actions
* Kubernetes deployment

---

# 📸 Screenshots

## Landing Page

![Landing Page](screenshots/landing.png)

## Dashboard

![Dashboard](screenshots/dashboard.png)

## Hub Created

![Hub Created](screenshots/hub-created.png)

---

# 📚 Documentation

Additional documentation:

```text
docs/API.md
```

contains detailed API documentation.

AWS deployment instructions:

```text
docs/DEPLOYMENT-AWS.md
```

Production-readiness changes:

```text
CHANGES.md
```

---

# 🧑‍💻 Git Workflow

Recommended branch:

```bash
git checkout -b feature/new-feature
```

Commit:

```bash
git add .
git commit -m "feat: add new feature"
```

Push:

```bash
git push origin feature/new-feature
```

---

# 📝 Commit Convention

This project can follow Conventional Commits.

```text
feat: New feature

fix: Bug fix

docs: Documentation

refactor: Code refactoring

style: Formatting

test: Tests

chore: Maintenance
```

Examples:

```bash
git commit -m "feat: add QR code generation"

git commit -m "fix: resolve analytics tracking issue"

git commit -m "docs: update deployment instructions"
```

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the repository

### 2. Create a feature branch

```bash
git checkout -b feature/NewFeature
```

### 3. Make your changes

### 4. Commit your changes

```bash
git add .
git commit -m "feat: add NewFeature"
```

### 5. Push the branch

```bash
git push origin feature/NewFeature
```

### 6. Open a Pull Request

---

# 📄 License

This project is intended for educational, portfolio, and demonstration purposes.

---

# ⭐ Project Summary

Smart Link Hub combines:

```text
React
+
Vite
+
Node.js
+
Express
+
PostgreSQL
+
JWT
+
bcrypt
+
Smart Rules
+
Analytics
+
QR Codes
+
Docker
+
AWS Deployment
```

into a single full-stack application.

The project demonstrates practical knowledge of:

* Frontend development
* REST API development
* Authentication
* Database design
* SQL
* Security
* Business logic
* Analytics
* API integration
* Docker
* Cloud deployment
* Production readiness

---

## ⚡ One-Line Project Description

**Smart Link Hub is a production-ready full-stack platform for creating personalized link pages with time, device, and location-based smart rules, analytics tracking, QR code generation, and secure JWT authentication.**
