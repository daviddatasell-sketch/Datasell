# User Management Tool - Usage Guide

## Overview
The `manage-users.js` tool allows you to view all users in your DataSell database and permanently delete test accounts with complete removal of all traces.

## What Gets Deleted When You Remove a User

When you delete a user, the tool removes:

✅ **User Profile** - From `users/{uid}` collection
✅ **Firebase Authentication** - From Firebase Auth system
✅ **All Transactions** - From `transactions` collection
✅ **All Activity Logs** - From `userLogs` collection

## How to Use

### 1. Run the Tool

```bash
node manage-users.js
```

### 2. View All Users

When you run the tool, it will immediately display a table of all users with:
- User ID (first 8 characters + ...)
- Full Name
- Email Address
- Phone Number
- Sign-in Method (google or email)
- Account Creation Date
- Admin Status (Yes/No)

### 3. Delete a User

1. Select option `1` to delete a user
2. Enter the **full User ID** (copy the complete ID from the database, not the shortened version)
3. Review the user details shown
4. Type `yes` to confirm deletion (any other input cancels)
5. The tool will:
   - Delete from database
   - Delete from Firebase Authentication
   - Delete all transactions
   - Delete all activity logs
   - Show updated user list

### 4. Exit

Select option `2` to exit the tool.

## Finding the Full User ID

The tool shows shortened User IDs (first 8 chars). To get the full ID:

**Option 1: From the tool itself**
- Look at the database directly at: `https://console.firebase.google.com`
- Navigate to Realtime Database → users → {full_uid}

**Option 2: Copy from admin portal**
- Go to `/admin` → Users tab
- View user IDs in the table

## Example Workflow

```
═══════════════════════════════════════════════════════════
📊 DATASELL USER MANAGEMENT TOOL
═══════════════════════════════════════════════════════════

📋 Loading all users from database...

┌────┬──────────────┬────────────────────┬──────────────┬────────┬─────────┬──────────┬───────┐
│ No.│ User ID      │ Name               │ Email        │ Phone  │ Sign-in │ Created  │ Admin │
├────┼──────────────┼────────────────────┼──────────────┼────────┼─────────┼──────────┼───────┤
│ 1  │ abc12345...  │ Test User          │ test@g...    │ N/A    │ google  │ 1/31/26  │ No    │
│ 2  │ def67890...  │ Real User          │ real@g...    │ 024... │ email   │ 1/30/26  │ No    │
└────┴──────────────┴────────────────────┴──────────────┴────────┴─────────┴──────────┴───────┘

✅ Total Users: 2

What would you like to do?
1. Delete a user
2. Exit

Enter choice (1-2): 1

Enter the full User ID to delete (or "cancel" to go back): abc12345abcdefghijklmnopqrstuvwx

🔍 Fetching user data for: abc12345abcdefghijklmnopqrstuvwx

⚠️  USER DATA TO BE DELETED:
   Email: test@gmail.com
   Name: Test User
   UID: abc12345abcdefghijklmnopqrstuvwx
   Created: 2026-01-31T10:20:00.000Z

🔴 Are you sure you want to PERMANENTLY DELETE this user? (type "yes" to confirm): yes

🗑️  Deleting user completely from database...
✅ User deleted from database
✅ User deleted from Firebase Authentication
✅ Deleted 5 user transactions
✅ Deleted 3 user activity logs

✅ User test@gmail.com has been PERMANENTLY deleted with NO TRACES!

📋 Updated user list:

┌────┬──────────────┬────────────────────┬──────────────┬────────┬─────────┬──────────┬───────┐
│ No.│ User ID      │ Name               │ Email        │ Phone  │ Sign-in │ Created  │ Admin │
├────┼──────────────┼────────────────────┼──────────────┼────────┼─────────┼──────────┼───────┤
│ 1  │ def67890...  │ Real User          │ real@g...    │ 024... │ email   │ 1/30/26  │ No    │
└────┴──────────────┴────────────────────┴──────────────┴────────┴─────────┴──────────┴───────┘

✅ Remaining Users: 1

What would you like to do?
1. Delete a user
2. Exit

Enter choice (1-2): 2

👋 Goodbye!
```

## Important Notes

⚠️ **PERMANENT DELETION** - This cannot be undone. Deleted users are completely removed.

⚠️ **ADMIN ACCOUNTS** - Be careful not to delete admin users by mistake.

⚠️ **FULL USER ID REQUIRED** - You must enter the complete User ID, not the shortened version shown in the table.

✅ **NO TRACES** - All associated data (transactions, logs, auth records) is completely deleted.

## Troubleshooting

**"User not found"**
- Make sure you copied the full User ID correctly
- Check the user exists in the database

**"Could not delete from Firebase Auth"**
- This is normal for users created via database-only auth
- The user is still deleted from the application database

**Permission Denied**
- Make sure your Firebase credentials in `.env` are correct
- Check your `.env` file has all required Firebase variables

## Need Help?

If you encounter issues:
1. Check the `.env` file has all required variables
2. Ensure you're using the full User ID (not truncated)
3. Check the console output for specific error messages
