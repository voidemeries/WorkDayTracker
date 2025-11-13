# Office Attendance Tracker

A modern web application for coordinating office attendance with your team. Track which days employees are working from the office, manage schedules, and approve change requests with an intuitive interface.

## Features

- 🔐 **Secure Authentication** - Sign in with Google or email/password using Firebase Authentication
- 🏢 **Room-Based Organization** - Create rooms for different teams, offices, or departments
- 📅 **Calendar Views** - Visual monthly calendar showing who's in the office each day
- ✅ **Approval Workflows** - Admins can approve join requests and schedule changes
- 🔄 **Real-Time Updates** - All changes sync instantly across all users
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile devices
- 🌙 **Dark Mode Ready** - Supports system-wide dark mode preferences

## Quick Start

### 1. Firebase Setup (Required)

This application requires a Firebase project with Realtime Database enabled. **You must complete these steps before the app will work:**

#### Create Firebase Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (the one you created when setting up the secrets)
3. Click **"Realtime Database"** in the left sidebar
4. Click **"Create Database"**
5. Choose a database location (e.g., `us-central1`)
6. **Start in test mode** for now (we'll add security rules next)
7. Click **"Enable"**

#### Configure Security Rules

After creating the database:

1. In the Firebase Console, go to **Realtime Database** > **Rules** tab
2. **Copy and paste** these security rules:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "$uid === auth.uid"
      }
    },
    "rooms": {
      ".read": "auth != null",
      "$roomId": {
        ".write": "!data.exists() || data.child('createdBy').val() === auth.uid",
        ".validate": "newData.hasChildren(['id', 'name', 'createdBy', 'createdAt', 'inviteCode'])"
      }
    },
    "roomMembers": {
      ".read": "auth != null",
      "$memberId": {
        ".write": "(!data.exists() && newData.child('userId').val() === auth.uid) || (data.exists() && data.child('userId').val() === auth.uid)",
        ".validate": "newData.hasChildren(['roomId', 'userId', 'role', 'status'])"
      }
    },
    "officeSchedules": {
      ".read": "auth != null",
      "$scheduleId": {
        ".write": "(!data.exists() && newData.child('userId').val() === auth.uid) || (data.exists() && data.child('userId').val() === auth.uid)",
        ".validate": "newData.hasChildren(['roomId', 'userId', 'date', 'status'])"
      }
    },
    "changeRequests": {
      ".read": "auth != null",
      "$requestId": {
        ".write": "(!data.exists() && newData.child('userId').val() === auth.uid) || (data.exists() && (data.child('userId').val() === auth.uid || newData.child('status').val() != 'pending'))",
        ".validate": "newData.hasChildren(['roomId', 'userId', 'newDate', 'status'])"
      }
    }
  }
}
```

3. Click **"Publish"** to apply the rules

#### Verify Setup

1. Refresh this Repl
2. The Firebase warning in the console should disappear
3. You can now sign up and use the application!

### 2. Using the Application

#### First Time Setup

1. Click **"Sign Up"** or use **"Continue with Google"**
2. After signing in, you'll see an empty dashboard
3. Click **"Create Room"** to set up your first office/team
4. Share the **invite code** with your team members

#### For Team Members

1. Sign up or sign in
2. Click **"Join Room"** and enter the invite code
3. Wait for an admin to approve your request
4. Once approved, you can view the calendar and request schedule changes

#### For Admins

As a room creator/admin, you can:
- **Approve/Reject Join Requests** - Go to Rooms > Click settings icon > View pending members
- **Approve/Reject Schedule Changes** - Go to Requests tab > Review pending schedule changes
- **View Team Calendar** - See who's in the office on any given day
- **Manage Members** - View all room members and their roles

## User Guide

### Creating a Room

1. Navigate to **Rooms** page
2. Click **"Create Room"**
3. Enter a room name (e.g., "Engineering Team", "New York Office")
4. You automatically become the admin
5. Share the generated invite code with your team

### Joining a Room

1. Navigate to **Rooms** page
2. Click **"Join Room"**
3. Enter the 6-character invite code
4. Wait for admin approval
5. You'll be notified when approved

### Managing Your Schedule

1. Go to the **Calendar** page
2. Select your room from the dropdown
3. Click on any date to see who's scheduled
4. Click **"Add Office Day"** or **"Change My Schedule"**
5. Select the new date and optionally provide a reason
6. Submit your request for admin approval

### Approving Requests (Admins Only)

1. Go to the **Requests** page
2. You'll see two tabs:
   - **Schedule Changes** - Team members requesting to change their office days
   - **Join Requests** - New people wanting to join the room
3. Review each request
4. Click **"Approve"** or **"Reject"**
5. Changes take effect immediately upon approval

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Firebase Realtime Database + Firebase Authentication
- **Routing**: Wouter (lightweight React router)
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## Architecture

This application uses Firebase's client-side SDK architecture:

- **Authentication** is handled entirely through Firebase Auth
- **Database operations** are performed directly from the client using Firebase SDK
- **Security** is enforced through Firebase Realtime Database security rules
- **Real-time updates** are achieved through Firebase's onValue listeners

This approach provides:
- Zero backend server maintenance
- Automatic scaling
- Real-time synchronization
- Built-in offline support

## Troubleshooting

### "Firebase WARNING: Firebase error"

**Solution**: You need to create the Realtime Database in Firebase Console (see Quick Start above)

### "Permission Denied" when accessing data

**Solution**: 
1. Make sure you're signed in
2. Verify security rules are published in Firebase Console
3. Check that the rules match exactly (including formatting)

### Can't sign in with Google

**Solution**:
1. Verify Google sign-in is enabled in Firebase Console > Authentication > Sign-in method
2. Make sure your Repl URL is in Firebase Console > Authentication > Settings > Authorized domains

### Data not updating in real-time

**Solution**:
1. Check browser console for errors
2. Verify you have a stable internet connection
3. Try refreshing the page

## Support

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## License

MIT
