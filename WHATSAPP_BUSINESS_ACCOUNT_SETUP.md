# WhatsApp Business Account Complete Setup Guide

## Current Situation

- ✅ You have a WhatsApp Business Account with admin number: **+1 (347) 949-2059**
- ✅ You have API credentials (Token, Phone Number ID, Business ID)
- ❌ The test number `15551918089` is Meta's test number, NOT your business number
- ❌ Your actual business number is NOT registered in the developer app yet

## Step-by-Step Setup Process

### Phase 1: Create/Access WhatsApp Business Account

**What You Need:**
- Your business phone number: **+1 (347) 949-2059**
- A valid business email
- Business verification documents (may be required)

**Steps:**

1. **Go to WhatsApp Business Manager**
   - Visit: https://business.facebook.com/
   - Log in with your Meta/Facebook account

2. **Create or Access Your Business Account**
   - If you don't have one: Click "Create Business Account"
   - If you have one: Select it from the list

3. **Navigate to WhatsApp**
   - In the left sidebar: Find **WhatsApp** or **Messaging**
   - Click on it

4. **Go to Phone Numbers Section**
   - Look for: **Phone Numbers** or **Manage Phone Numbers**
   - You should see your business number: **+1 (347) 949-2059**

---

### Phase 2: Register Your Business Phone Number

**Important:** Your phone number must be:
- ✅ Verified with WhatsApp
- ✅ Associated with your Business Account
- ✅ Not used with another WhatsApp Business Account

**Steps:**

1. **In WhatsApp Business Manager, go to Phone Numbers**

2. **Look for Your Number: +1 (347) 949-2059**
   - If it's listed: Check if it's **Verified** or **Pending Verification**
   - If it's NOT listed: Click "Add Phone Number" and add it

3. **Verify the Phone Number**
   - WhatsApp will send a verification code to the number
   - Enter the code in the Business Manager
   - Status should change to **Verified** ✅

4. **Get the Phone Number ID**
   - Once verified, you should see:
     - Phone Number: `+1 (347) 949-2059`
     - Phone Number ID: `1031296643397678` (you already have this)
     - Status: **Verified** or **Active**

---

### Phase 3: Connect Your App to the Phone Number

**Steps:**

1. **Go to Your App in Developers.facebook.com**
   - Visit: https://developers.facebook.com/
   - Select your app

2. **Go to WhatsApp Configuration**
   - Left sidebar: **WhatsApp** → **Configuration**

3. **Link Your Phone Number to the App**
   - Look for: **Phone Number ID** field
   - Enter: `1031296643397678`
   - This links your business number to your app

4. **Configure Webhook**
   - **Callback URL:** `https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp`
   - **Verify Token:** `bolted_iron_hub_verify_2026`
   - **Subscribe to:** `messages`, `message_template_status_update`, `message_status`

5. **Click "Verify and Save"**
   - WhatsApp will verify the webhook
   - You should see: ✅ **Webhook Verified**

---

### Phase 4: Get Your Access Token

**Steps:**

1. **Go to App Settings**
   - In developers.facebook.com: **Settings** → **Basic**

2. **Find Your App ID and App Secret**
   - App ID: (you'll see this)
   - App Secret: (you'll see this)

3. **Generate Access Token**
   - Go to: **Settings** → **User Token** or **App Token**
   - Or use: **Tools** → **Access Token Debugger**
   - Generate a new token with these permissions:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`

4. **Copy Your Access Token**
   - This is your: `WHATSAPP_TOKEN`
   - Keep it safe!

---

### Phase 5: Verify All Credentials

**Checklist - Make sure you have:**

- ✅ **Phone Number:** +1 (347) 949-2059 (Verified in WhatsApp Business Manager)
- ✅ **Phone Number ID:** 1031296643397678
- ✅ **Business Account ID (WABA ID):** 1413498966932374
- ✅ **Access Token:** EAARlGsHOwBkBQyBy6KHf2g7FWKdOdyQIaGevwKe3R2xyDzlLbI6I0NpCEs6jchKZBQKKPVO5UZCFyds1HdhHpNKCsaDR3qDkkoYBESXqniODOreRXz5HbQfRUfGhEw9JpvdJ8cr3CNSGTnGjRDcxkgMKZCBdvhovaEgoAZBz6ZCIIRvGJhfiz1ZBbpcwej03WZBxZA79ZCmaHKWPIgU2d6sT4yUUyWZAMH6PW6OzZC2N4gNARKDv5mgYhrGf6QZAafxiuQn1VhfCnoJf1ckY9TtpJYEdMgZAX
- ✅ **Verify Token:** bolted_iron_hub_verify_2026
- ✅ **Webhook URL:** https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp
- ✅ **Webhook Status:** Connected/Verified

---

### Phase 6: Test the Webhook

**Steps:**

1. **In WhatsApp Business Manager, go to Webhooks**

2. **Click "Test Webhook" or "Send Test Message"**
   - WhatsApp will send a test message to your webhook
   - You should see: ✅ **Webhook Verified**

3. **Check Your Admin Dashboard**
   - Go to: **WhatsApp Settings** → **Settings** tab
   - You should see:
     - ✅ Phone Number ID: 1031296643397678
     - ✅ Business Account ID: 1413498966932374
     - ✅ Webhook Status: Connected

---

### Phase 7: Add Your Business Number to a WhatsApp Group

**Steps:**

1. **On Your Phone (Admin's Phone)**
   - Open WhatsApp
   - Create a new group or open existing group
   - Add your business number: **+1 (347) 949-2059** to the group

2. **In Admin Dashboard**
   - Go to: **WhatsApp Settings** → **Groups** tab
   - Click: **Add Group**
   - Fill in:
     - **Group Chat ID:** (you'll get this from Message Logs when bot receives first message)
     - **Group Name:** (e.g., "Test Group" or "Project Team")
     - **Notes:** (optional)
   - Click: **Add Group**

3. **Enable the Group**
   - The group should appear in the list with **Active** status

---

### Phase 8: Test the Bot

**Steps:**

1. **Send a Command in WhatsApp Group**
   - From admin's phone, send: `/help`
   - Wait 5-10 seconds

2. **Check Message Logs**
   - Go to: **WhatsApp Settings** → **Message Logs** tab
   - You should see your command with:
     - ✅ Status: **success**
     - ✅ Response: Bot's reply

3. **Check Overview**
   - Go to: **WhatsApp Settings** → **Overview** tab
   - You should see:
     - ✅ Total Messages: increased
     - ✅ Success Rate: 100%
     - ✅ Command Usage: /help count increased

---

## Troubleshooting

### Issue: "Webhook not verified"
- **Solution:** Make sure Phone Number ID is correctly entered in webhook configuration
- **Check:** Phone Number ID should be: `1031296643397678`

### Issue: "Phone number not verified"
- **Solution:** Go to WhatsApp Business Manager and verify the phone number
- **Steps:** Phone Numbers → Select your number → Click "Verify" → Enter code sent to phone

### Issue: "No messages received"
- **Solution:** Make sure:
  1. ✅ Phone number is verified in Business Manager
  2. ✅ Phone number is added to a WhatsApp group
  3. ✅ Group is added to authorized groups in admin dashboard
  4. ✅ Group is enabled (Active status)
  5. ✅ Webhook status shows "Connected"

### Issue: "Messages marked as unauthorized"
- **Solution:** The group Chat ID in the system doesn't match what WhatsApp is sending
- **Fix:** Check Message Logs for the actual Group Chat ID and update the authorized group

---

## Next Steps

Once you complete all phases:

1. ✅ **Verify all credentials are correct**
2. ✅ **Test webhook connection**
3. ✅ **Add your business number to a test group**
4. ✅ **Send test commands**
5. ✅ **Check Message Logs for responses**

Then we'll proceed with full bot testing and deployment!

---

## Important Notes

- **Test Number vs Production Number:** The test number (15551918089) is for testing the API. Your production number (+1 (347) 949-2059) is what your customers will see.
- **Phone Number Verification:** Your number must be verified in WhatsApp Business Manager before it can send/receive messages.
- **Access Token Expiry:** Access tokens may expire. Keep your token updated.
- **Webhook Verification:** The webhook must be verified in WhatsApp Business Manager for messages to be delivered.

---

## Questions?

If you encounter any issues during setup, let me know which phase you're stuck on and I'll help you debug!
