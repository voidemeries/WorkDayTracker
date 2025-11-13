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

**CRITICAL**: You must configure these security rules in your Firebase Console under Realtime Database > Rules.

These rules enforce proper authorization and prevent unauthorized access:

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
        ".write": "(
          !data.exists() && newData.child('userId').val() === auth.uid
        ) || (
          data.exists() && (
            data.child('userId').val() === auth.uid ||
            root.child('roomMembers').orderByChild('roomId').equalTo(data.child('roomId').val()).orderByChild('role').equalTo('admin').orderByChild('userId').equalTo(auth.uid).val() != null
          )
        )",
        ".validate": "newData.hasChildren(['roomId', 'userId', 'role', 'status'])"
      }
    },
    "officeSchedules": {
      ".read": "auth != null",
      "$scheduleId": {
        ".write": "(
          !data.exists() && newData.child('userId').val() === auth.uid
        ) || (
          data.exists() && data.child('userId').val() === auth.uid
        )",
        ".validate": "newData.hasChildren(['roomId', 'userId', 'date', 'status'])"
      }
    },
    "changeRequests": {
      ".read": "auth != null",
      "$requestId": {
        ".write": "(
          !data.exists() && newData.child('userId').val() === auth.uid
        ) || (
          data.exists() && data.child('userId').val() === auth.uid
        ) || (
          data.exists() && newData.child('status').val() != 'pending'
        )",
        ".validate": "newData.hasChildren(['roomId', 'userId', 'newDate', 'status'])"
      }
    }
  }
}
```

**Security Features:**
- ✅ Users can only create/modify their own data
- ✅ Only room creators can modify room settings
- ✅ Users can join rooms (pending status) but admins must approve
- ✅ Room admins can approve/reject members
- ✅ Users can only create schedules for themselves
- ✅ Users can create change requests for themselves
- ✅ Admins can resolve change requests by updating status
- ✅ All writes are validated to ensure required fields exist

## Setting Up Firebase Realtime Database

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to "Realtime Database" in the left sidebar
4. Click "Create Database"
5. Choose a location (preferably close to your users)
   - US: `us-central1`
   - Europe: `europe-west1`
   - Asia: `asia-southeast1`
6. Start in **test mode** initially, then apply the security rules above
7. Click "Enable"
8. **Important**: After creating the database, copy the database URL shown at the top
   - It will look like: `https://your-project-default-rtdb.REGION.firebasedatabase.app`
   - If the app shows a region warning, update `client/src/lib/firebase.ts` line 14 with the correct URL

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
