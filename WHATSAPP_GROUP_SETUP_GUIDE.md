# WhatsApp Bot: Complete Group Setup & Activation Guide

## Overview

This guide explains how to add WhatsApp groups to the Bolted Iron Hub system and activate the bot for real-time project management via WhatsApp.

---

## Step 1: Create a WhatsApp Group (Admin's Responsibility)

The admin with the WhatsApp Business Account should:

1. **Open WhatsApp Business App** on their phone
2. **Create a new group** or use an existing one
3. **Add team members** who need access to the bot
4. **Note the group name** (you'll need this later)

**Example:**
- Group Name: "Project Alpha Team"
- Members: Project manager, team leads, stakeholders

---

## Step 2: Get the Group Chat ID

The bot automatically detects when it's added to a group and logs the **Group Chat ID**. You have two ways to get it:

### Method 1: Check Message Logs (Recommended)

1. Go to **WhatsApp Settings** → **Message Logs** tab
2. Look for the first message from the group
3. The **Group Chat ID** will be displayed in the log
4. Format: `120363123456789@g.us` (ends with `@g.us`)

### Method 2: Add Bot to Group First, Then Check Logs

1. Ask the admin to add the bot to the WhatsApp group
2. The bot will automatically log the first message
3. Go to **Message Logs** and find the Group Chat ID

---

## Step 3: Add Group to Admin Dashboard

Now that you have the Group Chat ID, add it to the system:

### Step 3.1: Navigate to WhatsApp Settings

1. Click **WhatsApp Settings** in the left sidebar
2. Click the **Groups** tab
3. Click the red **+ Add Group** button

### Step 3.2: Fill in the Add Group Form

**Required Fields:**

| Field | Description | Example |
|-------|-------------|---------|
| **Group Chat ID** | Unique identifier for the WhatsApp group | `120363123456789@g.us` |
| **Group Name** | Display name for the group | `Project Alpha Team` |
| **Notes** (Optional) | Any notes about the group | `Main project team, daily standup` |

**Form Instructions:**

1. **Group Chat ID field:**
   - Paste the Group Chat ID you found in Message Logs
   - Format must be: `[number]@g.us`
   - Example: `120363123456789@g.us`

2. **Group Name field:**
   - Enter a descriptive name for the group
   - This helps you identify the group in the dashboard
   - Example: `Project Alpha Team`

3. **Notes field:**
   - Add any useful information about this group
   - Optional but recommended
   - Example: `Main project team, daily standup meetings`

4. Click **Add Group** button

### Step 3.3: Verify Group Was Added

1. You should see the group appear in the **Authorized Groups** list
2. The group should have an **Active** badge (green)
3. If it shows **Inactive**, click the toggle to enable it

---

## Step 4: Activate the Bot in the Group

Once the group is added to the system:

1. **The bot is now authorized** to receive messages from this group
2. **Team members can send commands** like:
   - `/project` - Get project information
   - `/status` - Get current project status
   - `/team` - Get team member list
   - `/deadline` - Get upcoming deadlines
   - `/checklist` - Get project checklist
   - `/notes` - Get project notes
   - `/help` - Get help with all commands

---

## Step 5: Test the Bot

### Test in the WhatsApp Group:

1. **Send a test message** in the WhatsApp group: `/project`
2. **Wait for response** (should arrive within 5-10 seconds)
3. **Check Message Logs** in the admin dashboard:
   - Go to **WhatsApp Settings** → **Message Logs**
   - You should see your test message and the bot's response
   - Status should show as **success**

### If Bot Doesn't Respond:

1. **Check Group is Enabled:**
   - Go to **WhatsApp Settings** → **Groups**
   - Make sure the group has **Active** badge
   - If not, click the toggle to enable it

2. **Check Message Logs for Errors:**
   - Go to **WhatsApp Settings** → **Error Tracking**
   - Look for any error messages
   - Check the error details for troubleshooting

3. **Verify Webhook is Connected:**
   - Go to **WhatsApp Settings** → **Settings** tab
   - Confirm **Webhook Status** shows **Connected** (green checkmark)

---

## Complete Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Admin Creates WhatsApp Group                              │
│    └─ Adds team members to the group                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Admin Adds Bot to Group (or Bot Auto-Joins)              │
│    └─ Bot logs the Group Chat ID automatically              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Get Group Chat ID from Message Logs                       │
│    └─ Format: 120363123456789@g.us                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Add Group to Admin Dashboard                              │
│    └─ WhatsApp Settings → Groups → Add Group                │
│    └─ Fill in Group Chat ID, Name, Notes                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Bot is Now Active in the Group                            │
│    └─ Team can send commands: /project, /status, etc.       │
│    └─ Bot responds with project information                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Monitor Activity in Message Logs                          │
│    └─ Track all messages and responses                      │
│    └─ View analytics and error tracking                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Issue: "Group Chat ID not found"

**Solution:**
1. Make sure the bot has been added to the WhatsApp group
2. Send any message in the group (e.g., "hello")
3. Wait 10 seconds for the bot to log it
4. Check **Message Logs** for the Group Chat ID

### Issue: Bot doesn't respond to commands

**Solution:**
1. Verify the group is **Active** (green badge)
2. Check **Error Tracking** tab for error messages
3. Verify **Webhook Status** is **Connected**
4. Try sending `/help` command to test bot connectivity

### Issue: "Webhook Status: Not Connected"

**Solution:**
1. Go to **WhatsApp Settings** → **Settings** tab
2. Verify the webhook URL is correct:
   ```
   https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp
   ```
3. Check that your Meta Business account verification is complete
4. Verify token in WhatsApp Business Manager matches: `bolted_iron_hub_verify_2026`

### Issue: Group appears but shows "Inactive"

**Solution:**
1. Click the toggle button next to the group to enable it
2. The badge should change from **Inactive** (gray) to **Active** (green)
3. Now the bot can receive messages from this group

---

## Available Commands

Once the bot is active in a group, team members can use:

| Command | Description | Example Response |
|---------|-------------|------------------|
| `/project` | Get project information | Project name, description, status |
| `/status` | Get current project status | On Track / At Risk / Delayed |
| `/team` | Get team member list | Team members and roles |
| `/deadline` | Get upcoming deadlines | Next 5 deadlines with dates |
| `/checklist` | Get project checklist | Tasks and completion status |
| `/notes` | Get project notes | Recent project notes |
| `/help` | Get help with commands | List of all available commands |

---

## Next Steps

1. **Test the bot** with sample commands
2. **Monitor Message Logs** to track usage
3. **Check Analytics** to see command usage patterns
4. **Add more groups** as needed using the same process
5. **Configure Error Tracking** to monitor bot health

---

## Support

If you encounter any issues:

1. Check the **Error Tracking** tab for detailed error messages
2. Review **Message Logs** to see what messages were received
3. Verify **Webhook Status** is connected
4. Check that all groups are **Active** (enabled)

For technical support, contact the development team with:
- Group Chat ID
- Error message from Error Tracking tab
- Screenshot of the issue
