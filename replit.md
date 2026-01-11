# Cub Scout Pinewood Derby Portal

## Overview
A comprehensive portal for managing Cub Scout Pinewood Derby events. The system allows event organizers to create and configure derby events, manage participant registrations, and integrate with Band.us for community updates.

## Project Architecture

### Tech Stack
- **Frontend**: React with TypeScript, Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (client-side)
- **State Management**: TanStack Query

### Directory Structure
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
└── uploads/                # Uploaded images (participant/car photos)
```

## Key Features

### Event Management
- Create and configure derby events with names, dates, and descriptions
- Set registration open/close dates
- Configure dens/categories for participant grouping
- Configure voting categories for car design judging
- Mark events as active/inactive

### Registration System
- Multi-step registration form
- Participant photo upload
- Car photo upload
- Den/category selection
- Voting category preferences
- Registration period enforcement

### Band.us Integration (Requires Configuration)
- OAuth authentication with Band.us
- Pull posts from Band group
- Display upcoming calendar events
- **Required Secrets**: `BAND_CLIENT_ID`, `BAND_CLIENT_SECRET`

## Database Schema

### Tables
- `users` - Admin users (authenticated via Band.us OAuth)
- `derby_events` - Main event container with dates and configuration
- `dens` - Participant groupings per event (e.g., Tiger Den, Wolf Den)
- `voting_categories` - Car design categories per event (e.g., Most Creative)
- `registrations` - Participant registrations with car info and photos

## API Endpoints

### Events
- `GET /api/events` - List all events
- `GET /api/events/active` - Get the active event with all details
- `GET /api/events/:id` - Get event by ID with details
- `POST /api/events` - Create new event
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Dens
- `POST /api/dens` - Create new den
- `DELETE /api/dens/:id` - Delete den

### Voting Categories
- `POST /api/voting-categories` - Create new category
- `DELETE /api/voting-categories/:id` - Delete category

### Registrations
- `GET /api/registrations?eventId=` - Get registrations for event
- `POST /api/registrations` - Create registration (multipart/form-data)
- `PATCH /api/registrations/:id` - Update registration
- `DELETE /api/registrations/:id` - Delete registration

### Band.us
- `GET /api/band` - Get posts and events from Band group

## Development

### Running the App
```bash
npm run dev
```

### Database Migration Workflow

**Commands:**
- `npm run db:generate` - Generate new migration files from schema changes
- `npm run db:migrate` - Apply pending migrations to database
- `npm run db:push` - Direct schema push (development only, not recommended for production)

**Workflow:**
1. Make changes to `shared/schema.ts`
2. Run `npm run db:generate` to create a migration file in `./migrations/`
3. Commit the migration file to version control
4. Run `npm run db:migrate` to apply pending migrations

**Migration Files:** `./migrations/` folder contains versioned SQL migrations managed by Drizzle Kit

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Session encryption secret

### Optional (Band.us Integration)
- `BAND_CLIENT_ID` - Band.us OAuth client ID
- `BAND_CLIENT_SECRET` - Band.us OAuth client secret

## Recent Changes
- Initial implementation of Pinewood Derby Portal
- Event management with dens and voting categories
- Multi-step registration form with image uploads
- Gallery view with filtering by den
- Band.us integration placeholder (requires API credentials)
