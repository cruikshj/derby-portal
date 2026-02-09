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
- Create and configure derby events with names, dates, times, and descriptions
- Set registration open/close dates with specific times (timestamp with timezone)
- Set voting period start/end dates with specific times
- Configure dens/categories for participant grouping
- Configure voting categories for car design judging
- Mark events as active/inactive
- Countdown display shows hours when less than 24 hours remain

### Registration System
- Multi-step registration form
- Participant photo upload
- Car photo upload
- Den/category selection
- Voting category preferences
- Registration period enforcement

### Export Feature (Admin Only)
- Export all registrations as a ZIP file from the admin event editor
- Includes roster CSV with columns: Last Name, First Name, Car#, Car Name, Category, Participant Photo path, Car Photo path
- Includes photos organized in subdirectories: photos/participants/ and photos/cars/
- Photo filenames use participant names for easy identification
- Car numbers are generated sequentially (sorted alphabetically by participant name)

### Band.us Integration (Requires Configuration)
- OAuth authentication with Band.us
- Pull posts from Band group
- Display upcoming calendar events
- **Required Secrets**: `BAND_CLIENT_ID`, `BAND_CLIENT_SECRET`

### Voting System
- Admin creates a vote for an event (pre-fills category-car assignments from registration preferences)
- Admin manages category-car assignments (which cars appear in each voting category)
- Vote lifecycle: draft → open → closed → published
- Users vote on behalf of their registered participants (one ballot per participant)
- Each ballot contains one selection per voting category
- Voting window enforced via event votingStartDate/votingEndDate
- Admin reviews tallies, can override winners, then publishes results
- Published results appear in the gallery page

### Pages
- `/` - Home page with event countdown cards
- `/register` - Multi-step registration form
- `/gallery` - Participant gallery with published voting results
- `/vote` - User voting flow (per-participant, per-category)
- `/rules` - Event rules (if configured)
- `/info` - Event info (if configured)
- `/band` - Band.us integration
- `/admin` - Admin dashboard
- `/admin/events/:id` - Event editor with Voting tab

## Database Schema

### Tables
- `users` - Admin users (authenticated via Replit Auth/OIDC)
- `derby_events` - Main event container with dates and configuration
- `dens` - Participant groupings per event (e.g., Tiger Den, Wolf Den)
- `voting_categories` - Car design categories per event (e.g., Most Creative)
- `registrations` - Participant registrations with car info and photos
- `event_votes` - Vote instances per event (status: draft/open/closed/published)
- `vote_category_entries` - Which cars are in each voting category for a vote
- `vote_ballots` - Individual ballots (one per registered participant per vote)
- `vote_ballot_entries` - Individual vote selections within a ballot
- `vote_results` - Final results per category with optional admin overrides

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

### Export (Admin Only)
- `GET /api/events/:id/export` - Export registrations as ZIP file containing:
  - `roster.csv` with columns: Last Name, First Name, Car#, Car Name, Category, Participant Photo, Car Photo
  - `photos/participants/` folder with participant photos (named by participant name)
  - `photos/cars/` folder with car photos (named by participant name + "_car")

### Voting
- `GET /api/events/:id/vote` - Get vote for event (with category entries and results)
- `POST /api/events/:id/vote` - Create vote for event (admin, pre-fills from registrations)
- `PATCH /api/vote/:voteId/status` - Update vote status (admin)
- `PUT /api/vote/:voteId/categories/:categoryId/entries` - Set category entries (admin)
- `POST /api/vote/:voteId/ballots` - Submit ballot (user, per participant)
- `GET /api/vote/:voteId/ballots/me` - Get user's ballot statuses
- `GET /api/vote/:voteId/tally` - Get vote tally (admin)
- `POST /api/vote/:voteId/results` - Set vote results (admin)
- `GET /api/events/:id/results` - Get published results (public)

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
- Added comprehensive voting system (Feb 2026)
  - Database tables: event_votes, vote_category_entries, vote_ballots, vote_ballot_entries, vote_results
  - Admin vote builder in event editor (Voting tab) with category-car assignments
  - Vote lifecycle management: draft → open → closed → published
  - User voting page at /vote with per-participant, per-category wizard flow
  - Vote tallying, admin result overrides, and result publishing
  - Published results displayed in gallery page
  - Vote link added to navbar when voting dates configured
  - Home page voting card links to /vote page
- Added time support for all event dates (registration, voting, event date)
  - Database schema updated from `date` to `timestamp with time zone`
  - DateTimePicker component for date+time selection in admin forms
  - Countdown display shows hours/minutes when less than 24 hours remain
  - Proper timezone handling for both legacy date-only and new timestamp formats
- Initial implementation of Pinewood Derby Portal
- Event management with dens and voting categories
- Multi-step registration form with image uploads
- Gallery view with filtering by den
- Band.us integration placeholder (requires API credentials)
