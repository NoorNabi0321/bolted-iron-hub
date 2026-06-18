# WhatsApp Bot Command Design & Strategy

## 📊 System Data Analysis

Based on your database schema, here's what data is available:

### **Core Entities:**
1. **Projects** - Name, address, status, dates, GC contact, site supervisor, description
2. **Subcontractors** - Company name, contact, phone, email, trade, assigned projects
3. **Financials** - Contract value, billed amount, received amount, payout, billing status
4. **Checklists** - Items with completion status, cost tracking, assigned to
5. **Change Orders** - Description, amount, status (pending/approved/rejected)
6. **Project Notes** - Comments with timestamps and authors
7. **Project Files** - Attachments with metadata
8. **Project Messages** - Chat history with mentions

---

## 🎯 Recommended Command Structure

### **Tier 1: Information Queries** (Read-Only)
These commands retrieve and display project information.

#### **1. `/help` - Show all available commands**
- **Purpose:** Display command reference
- **Data Used:** Command list
- **Response Format:** Formatted list with syntax
- **Role:** Everyone
- **Status:** ✅ Already implemented (needs expansion)

---

#### **2. `/project <project-name>` - Get full project details**
- **Purpose:** Comprehensive project overview
- **Data Returned:**
  - Project name, address, borough
  - Current status
  - GC company and contact info
  - Site supervisor details
  - Start date, estimated end date, days remaining
  - Primary subcontractor assigned
  - Checklist completion percentage
  - Latest note
  - Change orders summary
- **Response Format:** Formatted text with sections
- **Role:** Admin/Super Admin
- **Status:** ✅ Already implemented

---

#### **3. `/status <project-name>` - Get current project status**
- **Purpose:** Quick status check
- **Data Returned:**
  - Project name
  - Current status (Shop Drawings, Fabrication, On-Site, Installed, Inspection Passed)
  - Last updated timestamp
  - Days since start
  - Days until deadline
  - % checklist complete
- **Response Format:** Short, concise text
- **Role:** Admin/Super Admin
- **Status:** ✅ Already implemented

---

#### **4. `/team <project-name>` - List assigned subcontractors**
- **Purpose:** View project team
- **Data Returned:**
  - Subcontractor company name
  - Contact person name
  - Trade/specialty
  - Phone number
  - Email
  - Role on project
- **Response Format:** List with contact details
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **5. `/checklist <project-name>` - Show project checklist**
- **Purpose:** View completion progress
- **Data Returned:**
  - All checklist items
  - Completion status (✓ or ✗)
  - Completed by (who marked it done)
  - Completion date
  - Overall completion percentage
  - Cost per item (if available)
  - Total cost
- **Response Format:** Formatted list with progress bar
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **6. `/notes <project-name>` - Show project notes**
- **Purpose:** View project comments and updates
- **Data Returned:**
  - Note content
  - Author name
  - Created timestamp
  - Whether it's admin-only
  - Last 10 notes (most recent first)
- **Response Format:** Chronological list with metadata
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **7. `/files <project-name>` - List project attachments**
- **Purpose:** View uploaded documents
- **Data Returned:**
  - File name
  - Upload date
  - Uploaded by
  - File size
  - File type (PDF, image, etc.)
  - Download link
- **Response Format:** List with file metadata
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **8. `/changes <project-name>` - Show change orders**
- **Purpose:** View scope changes and approvals
- **Data Returned:**
  - Change order number
  - Description
  - Amount
  - Status (pending/approved/rejected)
  - Created by
  - Approved by (if approved)
  - Created date
- **Response Format:** List with status indicators
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **9. `/financials <project-name>` - Get project financials**
- **Purpose:** View financial status (Admin only)
- **Data Returned:**
  - Contract value
  - Amount billed
  - Amount received
  - Subcontractor payout
  - Billing status
  - Outstanding balance
  - Profit/loss
- **Response Format:** Financial summary with calculations
- **Role:** Super Admin only
- **Status:** ❌ Not implemented

---

### **Tier 2: List & Search Commands**
These commands list multiple projects with filtering.

#### **10. `/list` - List all projects**
- **Purpose:** Quick overview of all projects
- **Data Returned:**
  - Project name
  - Current status
  - Assigned subcontractor
  - Days until deadline
  - Checklist % complete
- **Response Format:** Table or formatted list
- **Role:** Admin/Super Admin
- **Status:** ✅ Already implemented

---

#### **11. `/search <keyword>` - Search projects**
- **Purpose:** Find projects by name or address
- **Data Returned:**
  - Matching projects
  - Status
  - Address
- **Response Format:** List of matches
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **12. `/active` - Show active projects**
- **Purpose:** View projects in progress
- **Data Returned:**
  - Projects with status: Shop Drawings, Fabrication, On-Site, Installed
  - Exclude "Inspection Passed"
  - Count of active projects
- **Response Format:** List with status breakdown
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **13. `/completed` - Show completed projects**
- **Purpose:** View finished projects
- **Data Returned:**
  - Projects with status "Inspection Passed"
  - Completion date
  - Final cost
- **Response Format:** List with completion dates
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **14. `/pending` - Show pending approvals**
- **Purpose:** View items needing action
- **Data Returned:**
  - Pending change orders
  - Incomplete checklist items
  - Projects overdue
  - Count of pending items
- **Response Format:** Summary with action items
- **Role:** Admin/Super Admin
- **Status:** ✅ Already implemented

---

#### **15. `/overdue` - Show overdue projects**
- **Purpose:** View projects past deadline
- **Data Returned:**
  - Project name
  - Original deadline
  - Days overdue
  - Current status
  - Assigned subcontractor
- **Response Format:** List with days overdue
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

### **Tier 3: Analytics & Reports**
These commands generate reports and statistics.

#### **16. `/weekly` - Weekly schedule**
- **Purpose:** View projects scheduled this week
- **Data Returned:**
  - Projects by day
  - Status for each
  - Assigned team
  - Deadline info
- **Response Format:** Day-by-day breakdown or PDF
- **Role:** Admin/Super Admin
- **Status:** ✅ Already implemented

---

#### **17. `/report <project-name>` - Generate project report**
- **Purpose:** Comprehensive project summary
- **Data Returned:**
  - All project information
  - Timeline
  - Team assignments
  - Checklist progress
  - Financial summary
  - Recent notes
  - Change orders
- **Response Format:** PDF document
- **Role:** Admin/Super Admin
- **Status:** ✅ Already implemented

---

#### **18. `/stats` - System statistics**
- **Purpose:** High-level overview
- **Data Returned:**
  - Total projects
  - Active projects count
  - Completed projects count
  - Total contract value
  - Total billed amount
  - Total received amount
  - Average project duration
- **Response Format:** Summary with metrics
- **Role:** Super Admin only
- **Status:** ❌ Not implemented

---

#### **19. `/performance` - Subcontractor performance**
- **Purpose:** View team performance metrics
- **Data Returned:**
  - Subcontractor name
  - Projects assigned
  - Completion rate
  - Average project duration
  - Quality score (based on change orders)
- **Response Format:** Ranked list
- **Role:** Super Admin only
- **Status:** ❌ Not implemented

---

### **Tier 4: Action Commands** (Write/Modify)
These commands perform actions in the system.

#### **20. `/note <project-name> <message>` - Add project note**
- **Purpose:** Add comment to project
- **Data Modified:** Insert into projectNotes
- **Response:** Confirmation with timestamp
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **21. `/status-update <project-name> <new-status>` - Update project status**
- **Purpose:** Change project status
- **Data Modified:** Update projects.status
- **Response:** Confirmation with new status
- **Role:** Super Admin only
- **Status:** ❌ Not implemented

---

#### **22. `/check <project-name> <item-number>` - Mark checklist item complete**
- **Purpose:** Mark task as done
- **Data Modified:** Update projectChecklistItems.isCompleted
- **Response:** Confirmation with completion %
- **Role:** Admin/Super Admin
- **Status:** ❌ Not implemented

---

#### **23. `/approve <project-name> <change-order-number>` - Approve change order**
- **Purpose:** Approve scope change
- **Data Modified:** Update changeOrders.status to "approved"
- **Response:** Confirmation with amount
- **Role:** Super Admin only
- **Status:** ❌ Not implemented

---

#### **24. `/reject <project-name> <change-order-number>` - Reject change order**
- **Purpose:** Reject scope change
- **Data Modified:** Update changeOrders.status to "rejected"
- **Response:** Confirmation
- **Role:** Super Admin only
- **Status:** ❌ Not implemented

---

## 📈 Command Priority Matrix

### **Phase 1: MVP (Essential - Implement First)**
- ✅ `/help` - Command reference
- ✅ `/project` - Project details
- ✅ `/status` - Quick status
- ✅ `/list` - All projects
- ✅ `/weekly` - Weekly schedule
- ✅ `/pending` - Pending items
- ✅ `/report` - Project report

**Status:** 7/7 commands (100% complete)

---

### **Phase 2: Information Queries (High Priority)**
- `/team` - Subcontractor list
- `/checklist` - Completion status
- `/notes` - Project comments
- `/files` - Attachments
- `/changes` - Change orders
- `/search` - Project search
- `/active` - Active projects
- `/completed` - Finished projects
- `/overdue` - Overdue projects

**Status:** 0/9 commands (0% complete)

---

### **Phase 3: Analytics & Reports (Medium Priority)**
- `/stats` - System statistics
- `/performance` - Team performance
- `/financials` - Financial data (admin only)

**Status:** 0/3 commands (0% complete)

---

### **Phase 4: Action Commands (Lower Priority)**
- `/note` - Add comment
- `/status-update` - Change status
- `/check` - Mark checklist item
- `/approve` - Approve change order
- `/reject` - Reject change order

**Status:** 0/5 commands (0% complete)

---

## 🔄 Recommended Implementation Order

1. **Phase 2 Information Queries** (Next - 9 commands)
   - Start with `/team`, `/checklist`, `/notes`
   - Then `/files`, `/changes`
   - Then `/search`, `/active`, `/completed`, `/overdue`

2. **Phase 3 Analytics** (After Phase 2)
   - `/stats` - Quick to implement
   - `/performance` - Requires calculations
   - `/financials` - Admin-only data

3. **Phase 4 Action Commands** (Last)
   - `/note` - Simple insert
   - `/check` - Simple update
   - `/status-update`, `/approve`, `/reject` - Require validation

---

## 📋 Command Response Format Standards

### **Text Response Format:**
```
═══════════════════════════════════════════
PROJECT: [Name]
═══════════════════════════════════════════
Status: [Status]
Address: [Address]
GC Contact: [Name] - [Phone]
Deadline: [Date] ([Days] days remaining)
Team: [Subcontractor names]
Checklist: [X/Y items] (XX%)
═══════════════════════════════════════════
```

### **List Format:**
```
📋 PROJECTS (5 total)
1️⃣ Project A - Fabrication - 5 days left
2️⃣ Project B - On-Site - 12 days left
3️⃣ Project C - Shop Drawings - 8 days left
```

### **PDF Format:**
- Professional header with company branding
- Sections for each data type
- Tables for structured data
- Charts for statistics
- Timestamps and signatures

---

## 🎯 Success Metrics

Once all commands are implemented:
- ✅ 24 total commands available
- ✅ Covers all project data types
- ✅ Supports read, list, report, and action operations
- ✅ Role-based access control
- ✅ Real-time data from database
- ✅ Professional formatting
- ✅ Error handling and validation

---

## 🚀 Next Steps

**Immediate:** Implement Phase 2 commands (9 information queries)
**Timeline:** 2-3 weeks for full implementation
**Testing:** Test each command with real project data
**Documentation:** Update help command as new commands are added

Would you like me to start implementing Phase 2 commands? I recommend starting with:
1. `/team` - Easiest to implement
2. `/checklist` - High value
3. `/notes` - Frequently needed
