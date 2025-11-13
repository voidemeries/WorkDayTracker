# Firebase Setup Guide

This application uses Firebase Authentication and Firebase Realtime Database for user management and data persistence.

## Prerequisites

You should have already:
1. Created a Firebase project
2. Enabled Google sign-in in Authentication settings
3. Added your Repl's Dev URL to Authorized domains
4. Provided the Firebase secrets (VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_API_KEY)

## Firebase Realtime Database Structure

The application uses the following data structure in Firebase Realtime Database:

```
{
  "users": {
    "<userId>": {
      "id": "string",
      "name": "string",
      "email": "string",
      "createdAt": number
    }
  },
  "rooms": {
    "<roomId>": {
      "id": "string",
      "name": "string",
      "createdBy": "userId",
      "createdAt": number,
      "inviteCode": "string"
    }
  },
  "roomMembers": {
    "<memberId>": {
      "id": "string",
      "roomId": "string",
      "userId": "string",
      "role": "admin | member",
      "status": "pending | active",
      "createdAt": number
    }
  },
  "officeSchedules": {
    "<scheduleId>": {
      "id": "string",
      "roomId": "string",
      "userId": "string",
      "date": "YYYY-MM-DD",
      "status": "office | remote",
      "createdAt": number
    }
  },
  "changeRequests": {
    "<requestId>": {
      "id": "string",
      "roomId": "string",
      "userId": "string",
      "originalDate": "YYYY-MM-DD | null",
      "newDate": "YYYY-MM-DD",
      "reason": "string (optional)",
      "status": "pending | approved | rejected",
      "createdAt": number,
      "resolvedAt": number | null,
      "resolvedBy": "userId | null"
    }
  }
}
```

## Firebase Realtime Database Security Rules

**IMPORTANT**: You must configure these security rules in your Firebase Console under Realtime Database > Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid"
      }
    },
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.child('createdBy').val() === auth.uid)"
      }
    },
    "roomMembers": {
      "$memberId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() || 
          data.child('userId').val() === auth.uid ||
          root.child('roomMembers').orderByChild('roomId').equalTo(data.child('roomId').val()).val() != null
        )"
      }
    },
    "officeSchedules": {
      "$scheduleId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "changeRequests": {
      "$requestId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

These rules ensure:
- Users can only modify their own user data
- Authenticated users can read all rooms
- Only room creators can modify room data
- Room members and admins can manage memberships
- All authenticated users can create and manage schedules and requests

## Setting Up Firebase Realtime Database

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to "Realtime Database" in the left sidebar
4. Click "Create Database"
5. Choose a location (preferably close to your users)
6. Start in **test mode** initially, then apply the security rules above
7. Click "Enable"

## Applying Security Rules

1. In Firebase Console, go to Realtime Database
2. Click on the "Rules" tab
3. Replace the default rules with the rules provided above
4. Click "Publish"

## Authentication Setup

The application supports:
- **Email/Password authentication**: Users can sign up with email and password
- **Google Sign-In**: Users can authenticate using their Google account

Both methods are already enabled through the Firebase Authentication setup you completed.

## Testing the Setup

After configuring the database and rules:

1. Sign up with a test account
2. Create a room (this will create entries in `rooms` and `roomMembers`)
3. Invite another user to the room
4. Test schedule management and change requests

## Troubleshooting

### Database Permission Denied
- Verify security rules are published correctly
- Ensure the user is authenticated
- Check that the Firebase Realtime Database is enabled

### Authentication Errors
- Verify Google sign-in is enabled in Firebase Console
- Check that your Repl URL is in the Authorized domains list
- Ensure Firebase secrets are correctly set

### Data Not Appearing
- Check browser console for errors
- Verify Firebase configuration in `client/src/lib/firebase.ts`
- Ensure database URL is correct: `https://<project-id>-default-rtdb.firebaseio.com`

## Production Deployment

Before deploying to production:

1. Review and tighten security rules based on your needs
2. Add your production domain to Firebase Authorized domains
3. Enable Firebase App Check for additional security
4. Set up backup schedules for your Realtime Database
5. Monitor usage in Firebase Console to stay within quotas
