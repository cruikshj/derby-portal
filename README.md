# Cub Scout Pinewood Derby Portal

A comprehensive portal for managing Cub Scout Pinewood Derby events. The system allows event organizers to create and configure derby events, manage participant registrations, run voting for car design awards, assign racing awards, and integrate with Band.us for community updates.

## Features

- **Event Management** - Create and configure derby events with dates, registration periods, and voting windows
- **Registration System** - Multi-step registration form with participant and car photo uploads
- **Voting System** - Admin-managed voting for car design categories with per-participant ballots and publishable results
- **Racing Awards** - Admin-defined race day awards with direct winner assignment
- **Gallery** - Public gallery of registered participants with published voting and racing results
- **Export** - Export registrations as a ZIP file with a roster CSV and organized photos
- **Band.us Integration** - Pull posts and calendar events from a Band.us group (optional)
- **User Management** - Invite link system, access approval, and admin role management

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Google OAuth 2.0 via Passport.js
- **Session Store**: PostgreSQL-backed sessions via `connect-pg-simple`

---

## Running with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- A PostgreSQL database accessible from the container
- Google OAuth credentials (see [Authentication Setup](#authentication-setup) below)

### Build the Docker Image

```bash
docker build -t pinewood-derby .
```

### Run the Container

```bash
docker run -d \
  --name pinewood-derby \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e SESSION_SECRET="your-random-session-secret" \
  -e GOOGLE_CLIENT_ID="your-google-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  pinewood-derby
```

The application will be available at `http://localhost:5000`.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret key used to sign session cookies (use a long random string) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth 2.0 Client Secret |
| `BAND_CLIENT_ID` | No | Band.us OAuth Client ID (for Band.us integration) |
| `BAND_CLIENT_SECRET` | No | Band.us OAuth Client Secret (for Band.us integration) |

### Database Migrations

Before starting the application for the first time, run the database migrations to set up the schema:

```bash
docker run --rm \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  pinewood-derby \
  npx drizzle-kit migrate
```

### Docker Compose Example

For convenience, you can use Docker Compose to run the application alongside a PostgreSQL database:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: derby
      POSTGRES_PASSWORD: derby_password
      POSTGRES_DB: pinewood_derby
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://derby:derby_password@db:5432/pinewood_derby
      SESSION_SECRET: change-me-to-a-random-secret
      GOOGLE_CLIENT_ID: your-google-client-id
      GOOGLE_CLIENT_SECRET: your-google-client-secret
    depends_on:
      - db

volumes:
  pgdata:
```

Start everything with:

```bash
docker compose up -d
```

Then run migrations once:

```bash
docker compose exec app npx drizzle-kit migrate
```

---

## Authentication Setup

The application uses **Google OAuth 2.0** for user authentication. Follow these steps to set up credentials:

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > OAuth consent screen**
4. Choose **External** user type and click **Create**
5. Fill in the required fields (App name, User support email, Developer contact email) and save

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application** as the application type
4. Give it a name (e.g., "Pinewood Derby Portal")
5. Under **Authorized redirect URIs**, add:
   - For local/Docker development: `http://localhost:5000/api/auth/google/callback`
   - For production: `https://your-domain.com/api/auth/google/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** — these are your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### 3. Set the Environment Variables

Pass the credentials as environment variables when running the container (see [Run the Container](#run-the-container) above).

### User Access Control

- The **first user** to log in can be promoted to admin by directly updating the database:
  ```sql
  UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
  ```
- Admin users can manage other users from the admin dashboard, including approving access and granting admin roles.
- New users who sign in without an invite link will have a `pending` access status by default.
- Admins can generate **invite links** that automatically approve new users upon sign-in.

---

## Development

### Running Locally (without Docker)

```bash
npm install
npm run dev
```

This starts both the Express backend and Vite frontend dev server on port 5000.

### Database Commands

| Command | Description |
|---|---|
| `npm run db:generate` | Generate migration files from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (development only) |

### Project Structure

```
├── client/                 # Frontend React application
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       ├── lib/            # Utilities and context providers
│       └── hooks/          # Custom React hooks
├── server/                 # Backend Express server
│   ├── routes.ts           # API route handlers
│   ├── storage.ts          # Database storage layer
│   └── db.ts               # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle ORM schema definitions
├── migrations/             # Versioned SQL migrations
├── uploads/                # Uploaded images (participant/car photos)
└── Dockerfile              # Multi-stage production build
```
