# WhatsApp Bot Testing Guide

## Your Bot is Now Active! 🚀

**Group Name:** What's up bot  
**Group Chat ID:** 120363423043835752@g.us  
**Status:** ✅ Active  
**Webhook:** ✅ Connected

---

## Step 1: Send Test Commands in WhatsApp

Open the "What's up bot" WhatsApp group and send these commands one by one:

### Command 1: Get Help
```
/help
```
**Expected Response:**
```
Available Commands:
/project - Get project information
/status - Get current project status
/team - Get team member list
/deadline - Get upcoming deadlines
/checklist - Get project checklist
/notes - Get project notes
/help - Show this help message
```

### Command 2: Get Project Info
```
/project
```
**Expected Response:**
```
📋 Project Information

Project Name: [Your Project Name]
Description: [Project Description]
Status: [On Track / At Risk / Delayed]
Owner: [Owner Name]
Created: [Date]
```

### Command 3: Get Project Status
```
/status
```
**Expected Response:**
```
📊 Project Status

Current Status: [On Track / At Risk / Delayed]
Progress: [X%]
Last Updated: [Date/Time]
```

### Command 4: Get Team Members
```
/team
```
**Expected Response:**
```
👥 Team Members

1. [Member Name] - [Role]
2. [Member Name] - [Role]
3. [Member Name] - [Role]
...
```

### Command 5: Get Deadlines
```
/deadline
```
**Expected Response:**
```
📅 Upcoming Deadlines

1. [Task Name] - Due: [Date]
2. [Task Name] - Due: [Date]
3. [Task Name] - Due: [Date]
...
```

### Command 6: Get Checklist
```
/checklist
```
**Expected Response:**
```
✅ Project Checklist

☑ [Task 1]
☑ [Task 2]
☐ [Task 3]
...
```

### Command 7: Get Notes
```
/notes
```
**Expected Response:**
```
📝 Project Notes

[Note 1]
[Note 2]
[Note 3]
...
```

### Command 8: Test Invalid Command
```
/invalid
```
**Expected Response:**
```
❌ Unknown command: /invalid
Type /help for available commands
```

---

## Step 2: Monitor Bot Activity in Admin Dashboard

### Access Message Logs

1. Go to **WhatsApp Settings** in the admin dashboard
2. Click the **Message Logs** tab
3. You should see all your test commands here

**What to look for:**
- ✅ **Status**: Should show "success" for successful commands
- ✅ **Command Type**: Should show the command you sent (e.g., "project", "status")
- ✅ **Response**: Should show the bot's response message
- ✅ **Timestamp**: Should show when the message was processed
- ✅ **Response Time**: Should be under 5 seconds

### Check Error Tracking

1. Go to **WhatsApp Settings** → **Error Tracking** tab
2. If there are any errors, they'll appear here with details
3. Look for:
   - Error message
   - Command that failed
   - Error timestamp
   - Error count

### View Analytics

1. Go to **WhatsApp Settings** → **Overview** tab
2. Check the metrics:
   - **Total Messages**: Should increase with each test
   - **Active Groups**: Should show 1 (your test group)
   - **Success Rate**: Should be high (90%+)
   - **Error Rate**: Should be low (0-10%)

---

## Step 3: Detailed Monitoring Workflow

### Real-Time Monitoring

**While testing in WhatsApp:**

1. **Send command** in WhatsApp group
2. **Wait 5-10 seconds** for bot response
3. **Check Message Logs** in admin dashboard
4. **Verify response** matches expected output
5. **Check status** shows "success"

### Example Test Sequence

```
Time: 14:30:00 - Send: /project
Time: 14:30:02 - Bot responds with project info
Time: 14:30:05 - Check Message Logs → See entry with status: success

Time: 14:30:10 - Send: /status
Time: 14:30:12 - Bot responds with status
Time: 14:30:15 - Check Message Logs → See entry with status: success

Time: 14:30:20 - Send: /team
Time: 14:30:22 - Bot responds with team list
Time: 14:30:25 - Check Message Logs → See entry with status: success
```

---

## Step 4: What to Check in Message Logs

Each log entry should have:

| Field | Expected Value | Example |
|-------|-----------------|---------|
| **Group Chat ID** | 120363423043835752@g.us | 120363423043835752@g.us |
| **Sender Phone** | Admin's phone number | +1 (347) 949-2059 |
| **Message Text** | Your command | /project |
| **Command Type** | Parsed command | project |
| **Response** | Bot's response | 📋 Project Information... |
| **Status** | success or error | success |
| **Response Time** | < 5 seconds | 2.3s |
| **Timestamp** | Current time | 2026-03-13 14:30:05 |

---

## Step 5: Troubleshooting

### Issue: Bot Doesn't Respond

**Check:**
1. Is the group **Active** in WhatsApp Settings?
   - Go to **WhatsApp Settings** → **Groups** tab
   - Look for "What's up bot" group
   - Should have **Active** badge (green)
   - If not, click toggle to enable

2. Is the webhook connected?
   - Go to **WhatsApp Settings** → **Settings** tab
   - Check **Webhook Status**: Should show "Connected" ✅

3. Check Message Logs for errors:
   - Go to **Message Logs** tab
   - Look for your command
   - Check **Status** column
   - If error, click to see error details

### Issue: Bot Responds But With Wrong Data

**Check:**
1. Go to **Projects** page
2. Verify project data exists:
   - Project name
   - Project status
   - Team members
   - Deadlines
   - Checklist items
   - Notes

3. If data is missing, add it first:
   - Go to **Projects** → **Create New Project**
   - Fill in all required fields
   - Save project

4. Try the command again

### Issue: Command Shows as "invalid"

**Check:**
1. Verify command spelling:
   - `/project` (not `/projects`)
   - `/status` (not `/stat`)
   - `/team` (not `/teams`)
   - `/deadline` (not `/deadlines`)
   - `/checklist` (not `/check`)
   - `/notes` (not `/note`)
   - `/help` (not `/help me`)

2. Make sure command starts with `/`

3. Send `/help` to see all available commands

---

## Step 6: Performance Monitoring

### Response Time Expectations

| Command | Expected Time | Notes |
|---------|----------------|-------|
| `/help` | < 1 second | Simple response |
| `/project` | 1-2 seconds | Fetches project data |
| `/status` | 1-2 seconds | Calculates status |
| `/team` | 1-2 seconds | Fetches team members |
| `/deadline` | 2-3 seconds | Queries deadlines |
| `/checklist` | 2-3 seconds | Fetches checklist items |
| `/notes` | 2-3 seconds | Fetches project notes |

### Success Rate Expectations

- **Target**: 95%+ success rate
- **Acceptable**: 90%+ success rate
- **Needs Investigation**: < 90% success rate

---

## Step 7: Advanced Testing

### Test with Multiple Commands

Send multiple commands in quick succession to test:
1. Rate limiting
2. Queue handling
3. Concurrent message processing

**Example:**
```
/project
/status
/team
/deadline
/checklist
```

### Test with Different Users

If you have multiple team members in the group:
1. Have each member send a command
2. Verify all messages are logged
3. Check that responses work for all users

### Test with Special Characters

Send commands with special characters to test:
1. Emoji support
2. Unicode handling
3. Special characters

**Example:**
```
/project 🚀
/status ✅
```

---

## Step 8: Dashboard Overview

### WhatsApp Settings Dashboard

**Overview Tab:**
- Total Messages: Count of all messages processed
- Active Groups: Number of enabled groups (should be 1)
- Success Rate: Percentage of successful commands
- Error Rate: Percentage of failed commands
- Command Usage Chart: Shows which commands are used most

**Groups Tab:**
- List of authorized groups
- Group status (Active/Inactive)
- Last activity timestamp
- Toggle to enable/disable groups

**Error Tracking Tab:**
- List of errors that occurred
- Error messages
- Error timestamps
- Error frequency

**Settings Tab:**
- Phone Number ID: 1031296643397678
- Business Account ID: 1413498966932374
- Webhook Status: Connected ✅
- Webhook URL: https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp

---

## Summary: Complete Testing Checklist

- [ ] Send `/help` command
- [ ] Send `/project` command
- [ ] Send `/status` command
- [ ] Send `/team` command
- [ ] Send `/deadline` command
- [ ] Send `/checklist` command
- [ ] Send `/notes` command
- [ ] Send `/invalid` command (test error handling)
- [ ] Check Message Logs for all commands
- [ ] Verify all responses have "success" status
- [ ] Check response times are < 5 seconds
- [ ] Verify success rate is > 90%
- [ ] Check Overview metrics updated
- [ ] Verify group shows as "Active"
- [ ] Check webhook status shows "Connected"

---

## Next Steps After Testing

1. **Verify all commands work** with your actual project data
2. **Share with team members** for real-world testing
3. **Monitor usage** in Message Logs over time
4. **Collect feedback** from team on command usefulness
5. **Plan Phase 8** - Real-time updates with WebSocket
6. **Plan Phase 9** - Write commands (/update-status, /add-note)

---

## Support

If you encounter issues:

1. **Check Message Logs** for error details
2. **Review Error Tracking** tab for specific errors
3. **Verify group is Active** in WhatsApp Settings
4. **Confirm webhook is Connected** in Settings tab
5. **Check project data** exists in Projects page

For detailed error messages, check the **Error Tracking** tab in WhatsApp Settings.
