# WhatsApp Bot Integration - Implementation Phases

## Overview
This document outlines all phases required to implement a lightweight, read-only WhatsApp bot that allows admins and subcontractors to fetch project information directly from WhatsApp groups.

**Bot Capabilities**: Data fetching only (read-only, no updates/deletions)
**Access Control**: Admin-controlled group whitelist
**Integration**: WhatsApp Business Cloud API + Bolted Iron Hub System

---

## Phase 1: Foundation & Database Setup

### Objectives
- Set up database schema for WhatsApp integration
- Create tables for group management and message logging
- Establish data models for WhatsApp entities

### Tasks

#### 1.1 Create Database Tables
- **Table: `whatsapp_authorized_groups`**
  - `id` (UUID, primary key)
  - `groupChatId` (string, unique - WhatsApp group ID)
  - `groupName` (string - display name of group)
  - `isEnabled` (boolean - whether bot responds in this group)
  - `createdAt` (timestamp - when group was first discovered)
  - `updatedAt` (timestamp - when settings last changed)
  - `notes` (text, optional - admin notes)
  - `lastActivityAt` (timestamp - last message received)

- **Table: `whatsapp_messages_log`**
  - `id` (UUID, primary key)
  - `groupChatId` (string, foreign key)
  - `senderPhoneNumber` (string)
  - `messageText` (text - original message)
  - `commandType` (string - parsed command)
  - `responseText` (text - bot response)
  - `status` (enum: success, error, unauthorized)
  - `errorMessage` (text, optional)
  - `createdAt` (timestamp)

#### 1.2 Create Drizzle Schema
- Update `drizzle/schema.ts` with new table definitions
- Run `pnpm drizzle-kit generate` to create migration
- Execute migration via `webdev_execute_sql`

#### 1.3 Create Database Helpers
- Add functions in `server/db.ts`:
  - `getAuthorizedGroups()` - Fetch all authorized groups
  - `getGroupByGroupChatId(chatId)` - Find group by WhatsApp ID
  - `createOrUpdateGroup(chatId, groupName)` - Auto-register new groups
  - `toggleGroupAccess(groupChatId, isEnabled)` - Enable/disable bot
  - `logWhatsAppMessage(...)` - Log all interactions
  - `getGroupMessageLogs(groupChatId)` - Fetch logs for admin

### Deliverables
- ✅ Database migration applied
- ✅ New tables created with proper indexes
- ✅ Database helper functions implemented
- ✅ Unit tests for database functions

### Estimated Duration: 2-3 hours

---

## Phase 2: WhatsApp Webhook Setup & Integration

### Objectives
- Create webhook endpoint to receive messages from WhatsApp
- Implement webhook signature verification
- Set up message routing and basic error handling

### Tasks

#### 2.1 Create Webhook Endpoint
- Create `server/routers/whatsapp.ts` with new tRPC router
- Implement `POST /api/webhooks/whatsapp` endpoint
- Handle both webhook verification (GET) and message delivery (POST)

#### 2.2 Implement Webhook Verification
- Verify `X-Hub-Signature` header from WhatsApp
- Implement HMAC-SHA256 signature validation
- Return 200 OK with challenge token for verification

#### 2.3 Message Reception & Parsing
- Extract message data from WhatsApp payload:
  - `from` (sender phone number)
  - `chat_id` (group identifier)
  - `message_id` (unique message ID)
  - `timestamp` (message time)
  - `text.body` (actual message content)
- Normalize message text (trim, lowercase)
- Handle edge cases (empty messages, non-text messages)

#### 2.4 Group Authorization Check
- Before processing: Check if `chat_id` is in `whatsapp_authorized_groups` and `isEnabled = true`
- If unauthorized: Log message and return silently (no response)
- If authorized: Continue to command processing

#### 2.5 Message Logging
- Log all incoming messages to `whatsapp_messages_log`
- Include sender, group, message text, timestamp
- Log responses and any errors

#### 2.6 Error Handling
- Handle malformed requests gracefully
- Return appropriate HTTP status codes
- Log all errors for debugging

### Deliverables
- ✅ Webhook endpoint created and tested
- ✅ Signature verification working
- ✅ Message parsing implemented
- ✅ Authorization check functional
- ✅ Logging system in place
- ✅ Unit tests for webhook handler

### Estimated Duration: 4-5 hours

---

## Phase 3: Command Parser & Validator

### Objectives
- Parse user commands from WhatsApp messages
- Validate command syntax and parameters
- Route commands to appropriate handlers

### Tasks

#### 3.1 Command Parser Service
- Create `server/services/whatsappCommandParser.ts`
- Implement command pattern recognition:
  - Pattern: `/command [parameter1] [parameter2]`
  - Examples: `/project 274marcy`, `/status 274marcy`, `/help`
- Extract command type and parameters
- Handle case-insensitivity

#### 3.2 Command Registry
- Define all supported commands:
  1. `/project [project-name]` - Get full project info
  2. `/status [project-name]` - Get current status only
  3. `/team [project-name]` - List assigned subcontractors
  4. `/deadline [project-name]` - Show project deadline
  5. `/checklist [project-name]` - Show checklist items
  6. `/notes [project-name]` - Show additional notes
  7. `/help` - List all available commands

- For each command, define:
  - Command name and aliases
  - Required parameters
  - Description
  - Handler function

#### 3.3 Parameter Validation
- Validate project name exists in database
- Validate parameter format
- Return helpful error messages for invalid inputs

#### 3.4 Command Router
- Route parsed commands to appropriate handler functions
- Handle unknown commands gracefully
- Implement fallback to `/help` for invalid input

### Deliverables
- ✅ Command parser implemented
- ✅ Command registry defined
- ✅ Parameter validation working
- ✅ Command router functional
- ✅ Unit tests for all commands

### Estimated Duration: 3-4 hours

---

## Phase 4: Read-Only Command Handlers

### Objectives
- Implement handlers for all 7 read-only commands
- Fetch project data from database
- Format responses for WhatsApp

### Tasks

#### 4.1 Project Lookup Service
- Create `server/services/whatsappProjectLookup.ts`
- Implement fuzzy project name matching (handle typos)
- Fetch project by name, including:
  - Basic info (name, address, description)
  - Current status
  - Assigned subcontractors
  - Start date, deadline, estimated end date
  - Checklist items
  - Additional notes

#### 4.2 Command Handler: `/project`
- Fetch full project information
- Include: name, address, status, team, deadline, checklist, notes
- Format as readable WhatsApp message
- Handle project not found error

#### 4.3 Command Handler: `/status`
- Fetch only current project status
- Display status with emoji indicator
- Show last updated timestamp
- Handle project not found error

#### 4.4 Command Handler: `/team`
- List all assigned subcontractors
- Show company name and contact info (if available)
- Handle no subcontractors assigned case
- Handle project not found error

#### 4.5 Command Handler: `/deadline`
- Show project deadline date
- Calculate days remaining (if not completed)
- Show status relative to deadline (on-track, at-risk, overdue)
- Handle project not found error

#### 4.6 Command Handler: `/checklist`
- Fetch all checklist items for project
- Show completion status (✅ completed, ⏳ pending)
- Show percentage complete
- Handle empty checklist case
- Handle project not found error

#### 4.7 Command Handler: `/notes`
- Fetch additional notes for project
- Format notes with timestamps
- Show who added each note
- Handle no notes case
- Handle project not found error

#### 4.8 Command Handler: `/help`
- List all available commands
- Show command syntax
- Show brief description of each command
- Include example usage

### Deliverables
- ✅ All 7 command handlers implemented
- ✅ Project lookup service working
- ✅ Error handling for all edge cases
- ✅ Unit tests for each handler

### Estimated Duration: 5-6 hours

---

## Phase 5: Response Formatting & WhatsApp Integration

### Objectives
- Format responses for optimal WhatsApp readability
- Implement message sending to WhatsApp
- Handle response delivery and errors

### Tasks

#### 5.1 Response Formatter Service
- Create `server/services/whatsappResponseFormatter.ts`
- Implement formatting rules:
  - Use emojis for status indicators (✅ On-Site, 🔨 Fabrication, 📋 Shop Drawings, ⚙️ Installed, ✔️ Inspection Passed)
  - Use line breaks for readability
  - Use bold text for headers
  - Keep messages concise (WhatsApp has character limits)
  - Use bullet points for lists

#### 5.2 Status Emoji Mapping
- Create mapping for all project statuses:
  - Shop Drawings → 📋
  - Fabrication → 🔨
  - On-Site → ✅
  - Installed → ⚙️
  - Inspection Passed → ✔️

#### 5.3 Message Sending Service
- Create `server/services/whatsappMessageSender.ts`
- Implement WhatsApp API call to send message
- Use WhatsApp Cloud API endpoint: `https://graph.instagram.com/v18.0/{PHONE_NUMBER_ID}/messages`
- Include authentication (Bearer token)
- Handle API errors and retries

#### 5.4 Response Delivery
- Send formatted response back to the group
- Include message ID for tracking
- Log successful delivery
- Implement retry logic for failed sends (exponential backoff)

#### 5.5 Error Response Formatting
- Format error messages for WhatsApp
- Keep error messages user-friendly
- Suggest solutions (e.g., "Project not found. Try `/help` for command syntax")
- Log error details for admin debugging

### Deliverables
- ✅ Response formatter implemented
- ✅ Emoji mapping defined
- ✅ Message sender working
- ✅ Delivery tracking functional
- ✅ Error handling robust
- ✅ Unit tests for formatting and delivery

### Estimated Duration: 3-4 hours

---

## Phase 6: Admin Dashboard - WhatsApp Settings

### Objectives
- Create admin UI to manage authorized groups
- Allow enable/disable of bot for specific groups
- Display bot usage statistics

### Tasks

#### 6.1 Create WhatsApp Settings Page
- Create `client/src/pages/WhatsAppSettings.tsx`
- Add route in `client/src/App.tsx`
- Add navigation link in admin sidebar

#### 6.2 Authorized Groups List
- Display all discovered groups in a table:
  - Group name
  - Group Chat ID
  - Enable/Disable toggle
  - Last activity timestamp
  - Action buttons (edit, delete)

#### 6.3 Group Management Features
- **Enable/Disable Toggle**
  - Click toggle to enable/disable bot for group
  - Show confirmation dialog before disabling
  - Update `isEnabled` in database
  - Show success/error toast

- **Edit Group**
  - Allow admin to rename group
  - Allow admin to add notes
  - Save changes to database

- **Delete Group**
  - Remove group from whitelist
  - Show confirmation dialog
  - Delete associated message logs (optional)

#### 6.4 Group Discovery Display
- Show newly discovered groups (not yet enabled)
- Highlight them in the list
- Show notification badge

#### 6.5 Usage Statistics
- Show total messages received per group
- Show most used commands
- Show error rate
- Show last activity time

#### 6.6 WhatsApp Credentials Configuration
- Create section to input/update:
  - WhatsApp Business Account ID
  - Phone Number ID
  - API Token
  - Webhook Verify Token
- Use secure input fields (password type)
- Store in environment variables via `webdev_request_secrets`
- Show webhook URL for WhatsApp configuration

#### 6.7 Webhook Testing
- Add "Test Webhook" button
- Send test message to verify connectivity
- Show success/error result
- Display webhook status

### Deliverables
- ✅ WhatsApp Settings page created
- ✅ Groups list with enable/disable functionality
- ✅ Group management features working
- ✅ Statistics dashboard showing usage
- ✅ Credentials configuration UI
- ✅ Webhook testing tool
- ✅ Responsive design (mobile-friendly)

### Estimated Duration: 6-7 hours

---

## Phase 7: Message Logging & Admin Monitoring

### Objectives
- Implement comprehensive message logging
- Create admin dashboard to view bot interactions
- Enable debugging and monitoring

### Tasks

#### 7.1 Message Log Viewer
- Create `client/src/pages/WhatsAppMessageLogs.tsx`
- Display all messages in a filterable table:
  - Timestamp
  - Group name
  - Sender phone number
  - Command used
  - Response sent
  - Status (success/error)

#### 7.2 Filtering & Search
- Filter by group
- Filter by date range
- Filter by command type
- Filter by status (success/error)
- Search by sender phone number

#### 7.3 Message Details Modal
- Click on message to view full details:
  - Original message text
  - Parsed command
  - Full response
  - Any error messages
  - Timestamp
  - Sender info

#### 7.4 Error Tracking
- Highlight failed messages in red
- Show error reason
- Group errors by type
- Show error frequency

#### 7.5 Usage Analytics Dashboard
- Total messages processed
- Messages per group
- Most used commands
- Error rate
- Response time statistics
- Graphs/charts for visualization

#### 7.6 Export Logs
- Allow admin to export message logs as CSV
- Include date range selection
- Include filter options

### Deliverables
- ✅ Message log viewer created
- ✅ Filtering and search working
- ✅ Message details modal functional
- ✅ Error tracking implemented
- ✅ Analytics dashboard with charts
- ✅ Export functionality working

### Estimated Duration: 5-6 hours

---

## Phase 8: Testing & Quality Assurance

### Objectives
- Comprehensive testing of all bot functionality
- Ensure reliability and error handling
- Performance testing

### Tasks

#### 8.1 Unit Tests
- Test command parser (all 7 commands)
- Test project lookup service
- Test response formatter
- Test database functions
- Test authorization check
- Target: 90%+ code coverage

#### 8.2 Integration Tests
- Test webhook endpoint (signature verification)
- Test message reception and parsing
- Test command routing
- Test database operations
- Test WhatsApp API calls

#### 8.3 End-to-End Tests
- Simulate complete message flow:
  1. Message arrives from WhatsApp
  2. Webhook receives and verifies
  3. Command is parsed
  4. Handler fetches data
  5. Response is formatted
  6. Message is sent back to WhatsApp
  7. Interaction is logged

#### 8.4 Manual Testing
- Test each command in real WhatsApp group
- Test with various project names (exact, partial, typos)
- Test error scenarios (project not found, invalid command)
- Test authorization (authorized vs unauthorized groups)
- Test response formatting (readability, emoji display)

#### 8.5 Performance Testing
- Measure response time for each command
- Test with high message volume
- Test database query performance
- Optimize slow queries if needed

#### 8.6 Security Testing
- Test webhook signature verification
- Test authorization check
- Test SQL injection prevention
- Test rate limiting (if implemented)

### Deliverables
- ✅ All unit tests passing
- ✅ Integration tests passing
- ✅ End-to-end tests passing
- ✅ Manual testing completed
- ✅ Performance benchmarks documented
- ✅ Security audit completed

### Estimated Duration: 4-5 hours

---

## Phase 9: Documentation & Deployment

### Objectives
- Document bot functionality and usage
- Prepare for production deployment
- Create admin and user guides

### Tasks

#### 9.1 Admin Documentation
- **Setup Guide**: How to configure WhatsApp credentials
- **Group Management**: How to enable/disable bot for groups
- **Monitoring**: How to view message logs and statistics
- **Troubleshooting**: Common issues and solutions

#### 9.2 User Documentation
- **User Guide**: How to use bot commands
- **Command Reference**: All 7 commands with examples
- **FAQ**: Common questions and answers
- **Tips & Tricks**: Best practices

#### 9.3 Technical Documentation
- **Architecture**: System design and data flow
- **API Reference**: WhatsApp webhook format
- **Database Schema**: Table structures
- **Code Comments**: Inline documentation

#### 9.4 Deployment Checklist
- ✅ All tests passing
- ✅ Code reviewed
- ✅ Database migrations applied
- ✅ Environment variables configured
- ✅ Webhook URL configured in WhatsApp
- ✅ Admin dashboard tested
- ✅ Message logging verified
- ✅ Error handling tested

#### 9.5 Production Deployment
- Deploy code to production
- Run database migrations
- Configure WhatsApp webhook
- Test bot in production
- Monitor for errors
- Notify admin of successful deployment

#### 9.6 Post-Deployment
- Monitor bot performance
- Track error rates
- Gather user feedback
- Plan improvements

### Deliverables
- ✅ Admin documentation complete
- ✅ User documentation complete
- ✅ Technical documentation complete
- ✅ Deployment checklist verified
- ✅ Production deployment successful
- ✅ Monitoring in place

### Estimated Duration: 3-4 hours

---

## Phase 10: Enhancements & Future Features

### Objectives
- Plan for future improvements
- Implement nice-to-have features
- Optimize based on user feedback

### Tasks

#### 10.1 Potential Enhancements
- **Fuzzy Search**: Better project name matching (handle typos)
- **Quick Commands**: Short aliases for common commands (e.g., `/s` for `/status`)
- **Inline Buttons**: WhatsApp interactive buttons for quick actions
- **Rich Media**: Send project images/documents via WhatsApp
- **Scheduled Reports**: Auto-send weekly project summaries
- **Notifications**: Alert groups when project status changes
- **Multi-language Support**: Support multiple languages
- **Voice Messages**: Process voice commands (transcribe to text)

#### 10.2 Performance Optimization
- Implement caching for frequently accessed projects
- Optimize database queries
- Implement message queue for high-volume scenarios
- Add rate limiting to prevent abuse

#### 10.3 Advanced Features
- **AI-Powered Responses**: Use AI to understand natural language queries
- **Predictive Alerts**: Alert when project is at risk
- **Team Collaboration**: Allow subcontractors to share updates
- **Document Sharing**: Share project documents via WhatsApp

### Deliverables
- ✅ Enhancement roadmap documented
- ✅ User feedback collected
- ✅ Prioritized feature list created

### Estimated Duration: Ongoing

---

## Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1. Database Setup | 2-3 hrs | Tables, migrations, helpers |
| 2. Webhook Setup | 4-5 hrs | Endpoint, verification, routing |
| 3. Command Parser | 3-4 hrs | Parser, registry, validator |
| 4. Command Handlers | 5-6 hrs | All 7 commands implemented |
| 5. Response Formatting | 3-4 hrs | Formatter, sender, delivery |
| 6. Admin Dashboard | 6-7 hrs | Settings page, management UI |
| 7. Message Logging | 5-6 hrs | Logs, analytics, monitoring |
| 8. Testing & QA | 4-5 hrs | Tests, manual verification |
| 9. Documentation | 3-4 hrs | Guides, deployment |
| 10. Future Features | Ongoing | Enhancements, optimization |
| **TOTAL** | **38-48 hours** | **Full WhatsApp Bot Integration** |

---

## Implementation Order

1. **Start with Phase 1** - Set up database foundation
2. **Then Phase 2** - Get webhook receiving messages
3. **Then Phase 3-4** - Implement command parsing and handlers
4. **Then Phase 5** - Format and send responses
5. **Parallel: Phase 6** - Build admin dashboard
6. **Then Phase 7** - Add logging and monitoring
7. **Then Phase 8** - Comprehensive testing
8. **Then Phase 9** - Documentation and deployment
9. **Ongoing: Phase 10** - Enhancements based on feedback

---

## Success Criteria

✅ Bot successfully receives messages from authorized WhatsApp groups
✅ All 7 commands work correctly and return accurate data
✅ Responses are formatted nicely for WhatsApp readability
✅ Admin can enable/disable bot for specific groups
✅ All interactions are logged for monitoring
✅ Error handling is robust and user-friendly
✅ Performance is acceptable (responses within 2-3 seconds)
✅ Security is maintained (signature verification, authorization)
✅ Documentation is complete and clear
✅ System is deployed and working in production

---

## Notes

- **Read-Only Design**: Bot only fetches data, never modifies/deletes
- **Group Whitelist**: Admin has full control over which groups can use bot
- **Error Handling**: All errors are logged and reported gracefully
- **Scalability**: Design supports multiple groups and high message volume
- **Monitoring**: Comprehensive logging enables debugging and optimization
- **Security**: Webhook signature verification prevents unauthorized access
