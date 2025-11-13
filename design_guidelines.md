# Office Attendance Tracker - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Productivity-Focused)

**Rationale:** This is a utility application for daily workplace coordination, prioritizing efficiency, clarity, and rapid task completion. Drawing inspiration from modern productivity tools like Linear, Notion, and Asana that excel at information-dense interfaces.

**Core Principles:**
- Information clarity over visual flourish
- Efficient workflows with minimal friction
- Clear role-based interfaces (admin vs employee views)
- Scannable data presentation for quick decision-making

---

## Typography

**Font Stack:** Inter (via Google Fonts CDN) - excellent readability for data-heavy interfaces

**Hierarchy:**
- **Page Titles:** text-2xl font-semibold (Dashboard, Calendar, Requests)
- **Section Headers:** text-lg font-semibold (Today's Schedule, Pending Approvals)
- **Card Titles:** text-base font-medium (Room names, employee names)
- **Body Text:** text-sm font-normal (dates, descriptions, table content)
- **Labels/Meta:** text-xs font-medium uppercase tracking-wide (status badges, form labels)
- **Micro Text:** text-xs (timestamps, helper text)

---

## Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 4, 6, 8, 12, 16

**Common Patterns:**
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Card spacing: space-y-4
- Form field spacing: space-y-3
- Icon-to-text spacing: gap-2
- Page margins: px-4 md:px-8 max-w-7xl mx-auto

**Grid System:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Calendar layout: Full-width with sidebar (split: 3/4 calendar, 1/4 details)
- Request lists: Single column stacked cards with dividers

---

## Component Library

### Navigation

**Top Navigation Bar:**
- Fixed header with shadow (h-16, shadow-sm)
- Logo/app name left-aligned
- Navigation links center (Dashboard, Calendar, Requests, Rooms)
- User profile dropdown right-aligned with notification bell icon
- Room switcher dropdown for multi-room users
- Icons: Heroicons (via CDN)

### Dashboard Components

**Stats Cards:**
- Grid layout showing key metrics (Days in Office This Week, Upcoming Changes, Pending Approvals)
- Each card: rounded-lg border with p-6
- Icon + number + label layout
- Subtle hover lift effect

**Upcoming Office Days List:**
- Compact list showing next 7 days
- Each row: date badge + list of employees + office/remote indicator
- Scrollable if exceeds 6 items

**Quick Actions Panel:**
- Prominent CTAs: "Request Day Change", "View Full Calendar", "Manage Room" (admin only)
- Button hierarchy: primary for main action, secondary for others

### Calendar View

**Monthly Calendar Grid:**
- 7-column grid (Sun-Sat) with date cells
- Each date cell shows: day number + employee count indicator
- Selected date shows expanded detail panel
- Navigation: month/year selector with prev/next arrows
- Visual indicators: dots or avatars for scheduled employees

**Day Detail Sidebar:**
- Slides in when date selected
- Shows full list of employees for that day
- Employee cards with avatar, name, status
- Quick action to request swap if user is employee

### Request Management (Admin View)

**Pending Requests Queue:**
- Card-based layout with clear grouping
- Each request card shows: employee name + avatar, original date → new date, reason (if provided), timestamp
- Action buttons: Approve (primary) + Reject (destructive secondary) inline
- Filter tabs: All, Join Requests, Schedule Changes
- Empty state: friendly illustration with "No pending requests"

### Room Management

**Room Header:**
- Room name (editable for admin) + member count
- Settings icon for admins
- Invite code display with copy button
- "Leave Room" option for non-admins

**Member List:**
- Table or card layout with: avatar, name, email, role badge, status
- Admin actions: promote to admin, remove member
- Status badges for pending/active members

### Forms

**Request Change Form:**
- Clear two-step selection: current date → new date
- Date pickers with calendar popover
- Optional reason textarea (3 rows)
- Character count for reason field
- Submit button disabled until valid selection

**Authentication Forms:**
- Centered card layout (max-w-md mx-auto)
- Email/password inputs with validation states
- Divider with "or" between email and social auth
- Google sign-in button with logo
- Link to toggle between login/signup

### Status Indicators

**Badges:**
- Rounded-full px-3 py-1 text-xs font-medium
- Status types: Pending (neutral), Approved (success), Rejected (destructive), Active, Remote, In Office
- Positioned inline with context (next to names, dates)

**Notification Dot:**
- Absolute positioned red dot on notification bell
- Shows count if >1 pending item

### Data Tables (Employee Schedule)

**Clean Table Layout:**
- Striped rows for readability
- Columns: Date, Status (Office/Remote), Actions
- Sortable headers
- Mobile: stack as cards instead of table

---

## Responsive Behavior

**Breakpoints:**
- Mobile (default): Single column, stacked navigation (hamburger menu)
- Tablet (md: 768px): 2-column grids, horizontal navigation
- Desktop (lg: 1024px): 3-column grids, full calendar view

**Mobile Adaptations:**
- Calendar switches to agenda list view
- Sidebar panels become full-screen modals
- Stats cards stack vertically
- Table data converts to expandable cards

---

## Interaction Patterns

**Hover States:**
- Cards: subtle shadow increase (hover:shadow-md)
- List items: background change to indicate clickability
- Buttons: standard button component hover states

**Loading States:**
- Skeleton screens for calendar and lists during data fetch
- Spinner for form submissions
- Optimistic updates where possible (mark approved immediately, rollback if error)

**Transitions:**
- Smooth panel slides: transition-transform duration-300
- Fade effects for modals: transition-opacity duration-200
- No distracting animations on data updates

---

## Visual Hierarchy & Spacing

**Content Density:**
- Comfortable spacing for scan-ability
- Group related items tightly (gap-2 to gap-3)
- Separate unrelated sections generously (gap-8 to gap-12)

**Emphasis:**
- Primary actions always prominent (larger, filled buttons)
- Destructive actions (reject, leave room) use muted, outlined style until hover
- Status badges provide quick visual scanning

**Reading Flow:**
- Left-aligned text throughout (except centered auth forms)
- Consistent left-to-right information hierarchy
- Important data (names, dates) left, actions right

---

## Empty States

**Friendly, Actionable Empty States:**
- "No rooms yet" → CTA to create or join room
- "No pending requests" → Reassuring message for admins
- "Calendar loading" → Skeleton placeholder
- Center-aligned with simple illustration/icon

---

## Authentication Flow

**Onboarding Sequence:**
1. Login/Signup page (clean, centered card)
2. Post-auth: room selection or creation
3. If no rooms: prominent "Create Room" or "Join Room" options
4. Once in room: redirect to dashboard

**Session Indicators:**
- Persistent user avatar/name in nav
- Logout option in dropdown menu

---

## Images

**No hero images needed** - this is a productivity dashboard, not a marketing site. All views are functional interfaces focused on data display and task completion.

---

This design creates a professional, efficient workspace tool that employees and managers can use daily without cognitive overhead. The focus is on making attendance coordination feel effortless through clear information architecture and intuitive workflows.