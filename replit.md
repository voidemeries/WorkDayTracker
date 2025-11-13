# Office Attendance Tracker

## Overview

The Office Attendance Tracker is a team coordination application that helps companies track which days employees are working from the office. Built as a web application using React with Firebase for authentication and real-time data synchronization, it enables teams to manage office schedules, approve requests, and coordinate workspace presence across different rooms (teams, offices, or departments).

The application follows a room-based organization model where users can create or join rooms, with role-based permissions (admin/member) controlling access to scheduling and approval workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and caching
- **Tailwind CSS** with custom design system for styling

**UI Component Library:**
- **shadcn/ui** components built on Radix UI primitives
- Custom theme using CSS variables for light/dark mode support
- Design follows a "productivity-focused" approach inspired by Linear, prioritizing clarity and efficiency over visual flourish

**State Management Strategy:**
- Firebase real-time listeners for live data synchronization
- React Context (AuthContext) for global authentication state
- Local component state with hooks for UI-specific state
- TanStack Query for API data caching (minimal backend usage currently)

**Key Design Patterns:**
- Component composition with shadcn/ui primitives
- Custom hooks for Firebase data subscriptions
- Protected routes requiring authentication
- Real-time updates using Firebase onValue listeners

### Backend Architecture

**Runtime & Framework:**
- **Node.js** with Express.js server
- TypeScript for type safety across the stack
- ESM module system

**Current State:**
- Minimal backend implementation - most logic handled client-side via Firebase
- Express server primarily serves the Vite-built frontend
- Storage abstraction layer (MemStorage) defined but not actively used
- Routes scaffolded but empty (ready for future API endpoints)

**Database Configuration:**
- Drizzle ORM configured for PostgreSQL (not currently in use)
- Schema definitions exist but application uses Firebase Realtime Database instead

### Data Storage

**Primary Database: Firebase Realtime Database**

The application uses Firebase Realtime Database as its primary data store with the following structure:

```
/users/{userId}
  - id, name, email, createdAt

/rooms/{roomId}
  - id, name, createdBy, createdAt, inviteCode

/roomMembers/{memberId}
  - id, roomId, userId, role (admin|member), status (pending|active), createdAt

/officeSchedules/{scheduleId}
  - id, roomId, userId, date, status, createdAt

/changeRequests/{requestId}
  - id, roomId, userId, type, originalDate, newDate, reason, status, createdAt, reviewedBy, reviewedAt
```

**Security Rules:**
- Authenticated read access to most collections
- Write access controlled by ownership (users can only write their own data)
- Admin users can modify room-specific data for rooms they manage
- Pending requests visible to room admins for approval

**Rationale for Firebase:**
- Real-time synchronization across all connected clients
- Simplified authentication flow with built-in providers
- No backend API development needed for CRUD operations
- Scalable serverless architecture
- WebSocket-based live updates

**Note on PostgreSQL:**
- Drizzle ORM and PostgreSQL are configured but not used
- Database URL environment variable required but Postgres not provisioned
- Future migration path available if relational database needed

### Authentication & Authorization

**Authentication Provider: Firebase Authentication**

Supported sign-in methods:
- Google OAuth (primary method)
- Email/password authentication

**Authorization Model:**
- Role-based access control at the room level
- Two roles: `admin` and `member`
- Room creators automatically become admins
- Admins can approve/reject join requests and schedule change requests
- Members can view schedules and submit change requests

**Implementation:**
- AuthContext provides global authentication state
- Firebase Auth state persistence across sessions
- User profiles stored in Realtime Database after authentication
- Protected routes redirect unauthenticated users to login

### External Dependencies

**Core Services:**
- **Firebase** (Authentication, Realtime Database)
  - Project ID, API Key, App ID required as environment variables
  - Database URL: `https://{PROJECT_ID}-default-rtdb.europe-west1.firebasedatabase.app`
  - Must enable Google sign-in in Firebase Console
  - Requires authorized domains configuration for Replit deployment

**Development Tools:**
- **Replit-specific plugins** for development experience
  - Vite runtime error overlay
  - Cartographer (development mode only)
  - Dev banner (development mode only)

**UI Dependencies:**
- **Radix UI** primitives for accessible components (20+ packages)
- **Lucide React** for iconography
- **React Icons** (specifically `react-icons/si` for brand icons)
- **date-fns** for date manipulation
- **react-day-picker** for calendar UI
- **cmdk** for command palette patterns

**Form Handling:**
- **React Hook Form** for form state management
- **Zod** for schema validation
- **@hookform/resolvers** for Zod integration

**Styling:**
- **Tailwind CSS** with PostCSS
- **class-variance-authority** for component variants
- **tailwind-merge** and **clsx** for conditional classes

**Backend (configured but minimal usage):**
- **Drizzle ORM** for database operations
- **@neondatabase/serverless** for PostgreSQL connectivity
- Express session handling configured but not implemented

**Build & Development:**
- **Vite** for bundling and HMR
- **esbuild** for server-side bundling
- **tsx** for TypeScript execution in development
- TypeScript 5.x with strict mode enabled