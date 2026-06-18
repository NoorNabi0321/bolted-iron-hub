# Proposal & Auto-Checklist Feature - Implementation Phases

## Overview

This document outlines all phases required to implement the Proposal & Auto-Checklist feature. The feature allows users to upload PDF proposals, automatically extract checklist items, and manage them with drag-drop reordering and inline editing capabilities.

**Key Capabilities:**
- PDF proposal upload and automatic checklist extraction
- View mode with tick (complete) and delete functionality
- Edit mode with drag-drop reordering and inline text editing
- Persistent storage in database
- No AI/API required (pattern-based extraction)

---

## Phase 1: Database Schema & API Setup

### Objectives
- Create database tables for storing checklist items and proposals
- Set up API endpoints for CRUD operations
- Establish data models and relationships

### Key Tasks

#### 1.1 Create Database Tables

**Table: `project_proposals`**
- `id` (UUID, primary key)
- `projectId` (UUID, foreign key to projects table)
- `fileName` (string - original PDF filename)
- `fileUrl` (string - S3 URL or storage path)
- `uploadedAt` (timestamp)
- `extractedItemsCount` (integer - number of items extracted)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Table: `project_checklist_items`**
- `id` (UUID, primary key)
- `projectId` (UUID, foreign key to projects table)
- `text` (string - checklist item text)
- `isCompleted` (boolean - whether item is marked done)
- `order` (integer - sort order for display)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### 1.2 Update Drizzle Schema

- Add table definitions to `drizzle/schema.ts`
- Define relationships between tables
- Add indexes on `projectId` and `order` for performance
- Run `pnpm drizzle-kit generate` to create migration SQL
- Execute migration via `webdev_execute_sql`

#### 1.3 Create Database Helper Functions

Add functions to `server/db.ts`:
- `createProposal(projectId, fileName, fileUrl)` - Store proposal metadata
- `getProposalByProjectId(projectId)` - Fetch latest proposal
- `createChecklistItem(projectId, text, order)` - Add checklist item
- `getChecklistItems(projectId)` - Fetch all items for project (ordered)
- `updateChecklistItem(id, text, isCompleted, order)` - Update item
- `deleteChecklistItem(id)` - Delete item
- `reorderChecklistItems(projectId, items)` - Bulk update order
- `deleteAllChecklistItems(projectId)` - Clear all items for project

#### 1.4 Create tRPC Procedures

Add to `server/routers/projects.ts`:
- `proposals.uploadProposal` - Handle file upload and extraction
- `proposals.getProposal` - Fetch proposal metadata
- `checklist.getItems` - Fetch all checklist items
- `checklist.createItem` - Add new item
- `checklist.updateItem` - Update item (text/completion)
- `checklist.deleteItem` - Delete item
- `checklist.reorderItems` - Reorder multiple items
- `checklist.deleteAllItems` - Clear all items

### Deliverables
- ✅ Database migration created and applied
- ✅ Tables created with proper relationships
- ✅ Database helper functions implemented
- ✅ tRPC procedures defined with input validation
- ✅ Unit tests for database functions

### Estimated Duration: 3-4 hours

---

## Phase 2: PDF Extraction Service

### Objectives
- Extract text from PDF proposals
- Parse extracted text to identify checklist items
- Handle consistent proposal format with pattern matching

### Key Tasks

#### 2.1 Create PDF Text Extraction Service

Create `server/services/pdfExtractor.ts`:
- Use `pdf-parse` library to extract raw text from PDF
- Handle file buffer input
- Return extracted text as string
- Add error handling for corrupted/invalid PDFs

#### 2.2 Create Proposal Parser Service

Create `server/services/proposalParser.ts`:
- Parse extracted text to find "Fabrication And Installation" section
- Use regex patterns to identify section boundaries
- Extract table rows from the section
- Identify item names (first column) from each row

**Key Parsing Logic:**
- Find section header: `/(Fabrication And Installation|Installation|Fabrication)/i`
- Skip table header row: `/(Description|Qty|Rate|Total)/i`
- Extract items: Lines that contain quantity numbers (157, 178, 33, etc.)
- Clean item text: Remove leading/trailing whitespace, normalize spacing
- Handle multi-line items: Combine lines until next quantity number appears

#### 2.3 Create Item Cleaner

Add function to normalize extracted items:
- Remove extra whitespace and line breaks
- Trim text to reasonable length
- Remove special characters if needed
- Validate item is not empty

#### 2.4 Create Extraction Pipeline

Create main function `extractChecklistFromPDF`:
- Input: PDF file buffer
- Step 1: Extract text using pdf-parse
- Step 2: Parse text to find section
- Step 3: Extract items using regex
- Step 4: Clean and validate items
- Output: Array of cleaned item strings
- Error handling: Return meaningful error messages

#### 2.5 Add Unit Tests

Test the extraction pipeline:
- Test with provided proposal PDF
- Test with different proposal formats (if available)
- Test edge cases (empty section, no items, malformed text)
- Verify extracted items match expected output

### Deliverables
- ✅ PDF text extraction service working
- ✅ Proposal parser with regex patterns
- ✅ Item cleaner and validator
- ✅ Complete extraction pipeline
- ✅ Unit tests with 90%+ coverage
- ✅ Handles errors gracefully

### Estimated Duration: 4-5 hours

---

## Phase 3: File Upload & Extraction Endpoint

### Objectives
- Create backend endpoint to handle file uploads
- Integrate PDF extraction service
- Store proposal metadata and extracted items in database

### Key Tasks

#### 3.1 Create File Upload Handler

Add to `server/routers/projects.ts`:
- Create `proposals.uploadProposal` tRPC procedure
- Input: `projectId`, `file` (FormData)
- Validate file type (PDF only)
- Validate file size (max 16MB)
- Validate project exists

#### 3.2 Integrate PDF Extraction

In upload handler:
- Extract file buffer from upload
- Call `extractChecklistFromPDF()` service
- Handle extraction errors
- Return extracted items to frontend

#### 3.3 Store Proposal & Items

After successful extraction:
- Call `createProposal()` to store proposal metadata
- Call `createChecklistItem()` for each extracted item with order
- Handle database errors
- Return success response with extracted items count

#### 3.4 Error Handling

- Invalid file type → Return error message
- File too large → Return error message
- PDF extraction fails → Return error message
- Database error → Return error message
- All errors logged for debugging

#### 3.5 Add Response Validation

- Validate extracted items array
- Ensure all items have text
- Return count of items extracted
- Return proposal metadata (fileName, uploadedAt)

### Deliverables
- ✅ Upload endpoint created
- ✅ File validation working
- ✅ PDF extraction integrated
- ✅ Database storage working
- ✅ Error handling robust
- ✅ Unit tests for endpoint

### Estimated Duration: 2-3 hours

---

## Phase 4: Frontend - View Mode UI

### Objectives
- Create frontend component for displaying checklist in view mode
- Implement tick and delete functionality
- Display proposal upload status

### Key Tasks

#### 4.1 Create Checklist Component Structure

Create `client/src/components/ProjectChecklist.tsx`:
- Parent component managing view/edit mode state
- Child components:
  - `ChecklistHeader` - Title and action buttons
  - `ChecklistViewMode` - Read-only display
  - `ChecklistEditMode` - Editable canvas (Phase 5)

#### 4.2 Implement Checklist View Mode

Create `client/src/components/ChecklistViewMode.tsx`:
- Display each item as a row with:
  - **Tick Icon** (left): Clickable, toggles completion
    - Uncompleted: Empty circle icon
    - Completed: Filled checkmark icon
  - **Item Text** (middle): Display text
    - Completed items: Strikethrough, gray color
    - Uncompleted items: Normal text
  - **Delete Icon** (right): Trash/dustbin icon, clickable
- Show completion progress: "X of Y items complete (Z%)"
- Show empty state if no items

#### 4.3 Implement Tick Functionality

- Click tick icon → Call `checklist.updateItem` mutation
- Toggle `isCompleted` boolean
- Update UI immediately (optimistic update)
- Show loading state during API call
- Handle errors gracefully

#### 4.4 Implement Delete Functionality

- Click delete icon → Show confirmation dialog
- Confirm dialog: "Delete this item?"
- On confirm → Call `checklist.deleteItem` mutation
- Remove item from UI
- Show success toast
- Handle errors gracefully

#### 4.5 Implement Add Item Button

- Button at top of section: "+ Add Item"
- Click → Show modal or inline input
- Input: New item text
- On save → Call `checklist.createItem` mutation
- Add item to list with highest order number
- Clear input, show success toast

#### 4.6 Fetch & Display Checklist

- On component mount: Fetch items via `checklist.getItems` query
- Display loading skeleton while fetching
- Handle empty state (no items yet)
- Handle error state

### Deliverables
- ✅ Checklist component created
- ✅ View mode UI matching design
- ✅ Tick functionality working
- ✅ Delete functionality with confirmation
- ✅ Add item functionality working
- ✅ Completion progress displayed
- ✅ Loading and error states handled
- ✅ Responsive design

### Estimated Duration: 3-4 hours

---

## Phase 5: Frontend - Edit Mode with Drag-Drop

### Objectives
- Implement edit mode with drag-drop reordering
- Add inline text editing capability
- Create save/cancel workflow

### Key Tasks

#### 5.1 Install Drag-Drop Library

- Install `react-beautiful-dnd` or `@dnd-kit/core`
- **Recommendation**: `react-beautiful-dnd` (better UX, easier to use)
- Install: `pnpm add react-beautiful-dnd`
- Install types: `pnpm add -D @types/react-beautiful-dnd`

#### 5.2 Create Edit Mode Component

Create `client/src/components/ChecklistEditMode.tsx`:
- Wrap items in DragDropContext
- Create Droppable container for items
- Create Draggable wrapper for each item
- Add drag handle icon (⋮⋮) on left
- Add inline text editor for each item
- Add delete button for each item
- Add Save and Cancel buttons at bottom

#### 5.3 Implement Drag-Drop Reordering

- Use `react-beautiful-dnd` DragDropContext/Droppable/Draggable
- Handle `onDragEnd` event
- Update local state with new order
- Show visual feedback during drag (shadow, highlight)
- Smooth animations for drag movement
- Prevent drag for completed items (optional)

#### 5.4 Implement Inline Text Editing

- Click on item text → Convert to input field
- Auto-focus input field
- Show current text in input
- Keyboard shortcuts:
  - Enter → Save edit
  - Escape → Cancel edit
- Click outside → Save edit
- Show edit indicator (pencil icon)

#### 5.5 Implement Save Functionality

- Click Save button → Validate all items
- Call `checklist.reorderItems` to update order
- Call `checklist.updateItem` for each edited item
- Show loading state during save
- On success:
  - Exit edit mode
  - Show success toast
  - Refresh checklist display
- On error:
  - Show error toast
  - Keep edit mode active
  - Allow user to retry

#### 5.6 Implement Cancel Functionality

- Click Cancel button → Discard changes
- Confirm if changes were made: "Discard changes?"
- Exit edit mode
- Reload items from database (or from cache)

#### 5.7 Add Visual Styling for Edit Mode

- Different background color for edit mode
- Borders around editable items
- Hover effects (shadow, background change)
- Drag handle cursor changes
- Smooth transitions between modes
- Use Tailwind classes for styling

#### 5.8 Add Keyboard Shortcuts

- Escape → Exit edit mode (with confirmation)
- Ctrl+S or Cmd+S → Save changes
- Tab → Move to next item

### Deliverables
- ✅ Drag-drop library installed
- ✅ Edit mode component created
- ✅ Drag-drop reordering working
- ✅ Inline text editing working
- ✅ Save/cancel workflow functional
- ✅ Visual feedback and animations smooth
- ✅ Keyboard shortcuts working
- ✅ Error handling robust

### Estimated Duration: 6-7 hours

---

## Phase 6: Proposal Upload UI & Integration

### Objectives
- Create UI for uploading PDF proposals
- Display upload status and extracted items
- Integrate with extraction backend

### Key Tasks

#### 6.1 Create Proposal Upload Component

Create `client/src/components/ProposalUpload.tsx`:
- Display upload area with dashed border
- Show upload icon and text: "Upload a proposal to automatically generate a checklist"
- Show file types: "PDF, DOC, DOCX, or image files up to 16MB"
- Show "Choose File" button
- Handle file selection

#### 6.2 Implement File Upload Handler

- On file selected:
  - Validate file type (PDF only for now)
  - Validate file size (max 16MB)
  - Show validation errors if needed
  - Call `proposals.uploadProposal` mutation
  - Show loading state during upload

#### 6.3 Display Upload Status

- **Before upload**: Show upload area
- **During upload**: Show progress bar or spinner
- **After success**: 
  - Show success message: "✓ Proposal uploaded"
  - Show "View proposal" link
  - Show extracted items count
  - Show extracted items in checklist below
- **On error**: Show error message with details

#### 6.4 Handle Extraction Results

- On successful extraction:
  - Display success banner
  - Show number of items extracted
  - Populate checklist with extracted items
  - Items start with `isCompleted = false`
  - Items have sequential order numbers

#### 6.5 Add View Proposal Link

- Show link to view uploaded PDF
- Click → Open PDF in new tab or modal
- Use S3 URL from stored proposal

#### 6.6 Handle Multiple Uploads

- Allow uploading new proposal (replaces old one)
- Show confirmation: "Replace existing proposal?"
- Delete old checklist items
- Create new checklist from new proposal

### Deliverables
- ✅ Upload component created
- ✅ File validation working
- ✅ Upload progress shown
- ✅ Success/error states handled
- ✅ Extracted items displayed
- ✅ View proposal link working
- ✅ Multiple uploads handled

### Estimated Duration: 3-4 hours

---

## Phase 7: Integration & Component Assembly

### Objectives
- Assemble all components into project details page
- Ensure smooth data flow between components
- Test complete workflow

### Key Tasks

#### 7.1 Integrate into Project Details Page

- Add Proposal & Auto-Checklist section to project details
- Import components:
  - ProposalUpload
  - ProjectChecklist (with view/edit modes)
- Pass `projectId` as prop
- Handle state management

#### 7.2 Create Section Layout

- Section title: "Proposal & Auto-Checklist"
- Two subsections:
  - **Proposal Upload**: Upload area and status
  - **Checklist & Tasks**: View/edit checklist
- Responsive layout (mobile-friendly)

#### 7.3 Implement Data Flow

- Upload proposal → Extract items → Display in checklist
- Edit checklist → Save changes → Update database
- Delete item → Remove from UI and database
- Complete item → Update UI and database

#### 7.4 Add Loading States

- Show skeleton loaders while fetching data
- Show spinners during API calls
- Disable buttons during operations

#### 7.5 Add Error Handling

- Display error messages to user
- Log errors for debugging
- Provide retry options
- Show helpful error messages

#### 7.6 Add Success Notifications

- Toast notifications for successful operations
- Show operation details (items extracted, item added, etc.)
- Auto-dismiss after 3-5 seconds

### Deliverables
- ✅ All components integrated
- ✅ Data flow working correctly
- ✅ Loading states functional
- ✅ Error handling robust
- ✅ Success notifications showing
- ✅ Responsive layout

### Estimated Duration: 2-3 hours

---

## Phase 8: Testing & Quality Assurance

### Objectives
- Comprehensive testing of all functionality
- Ensure reliability and performance
- Verify user workflows

### Key Tasks

#### 8.1 Unit Tests

- Test PDF extraction service
  - Test with provided proposal PDF
  - Test extraction accuracy
  - Test error handling

- Test proposal parser
  - Test regex patterns
  - Test item extraction
  - Test edge cases

- Test database functions
  - Test CRUD operations
  - Test ordering
  - Test relationships

- Test tRPC procedures
  - Test input validation
  - Test error responses
  - Test success responses

#### 8.2 Integration Tests

- Test upload endpoint
  - Test file upload
  - Test extraction pipeline
  - Test database storage

- Test checklist API
  - Test get items
  - Test create/update/delete
  - Test reordering

#### 8.3 Component Tests

- Test view mode
  - Test tick functionality
  - Test delete functionality
  - Test add item functionality

- Test edit mode
  - Test drag-drop reordering
  - Test inline editing
  - Test save/cancel

#### 8.4 End-to-End Testing

- Complete workflow:
  1. Upload PDF proposal
  2. Verify items extracted correctly
  3. Mark items as complete
  4. Delete an item
  5. Add new item
  6. Enter edit mode
  7. Reorder items
  8. Edit item text
  9. Save changes
  10. Verify changes persisted

#### 8.5 Manual Testing

- Test with provided proposal PDF
- Test with different screen sizes (mobile, tablet, desktop)
- Test error scenarios (invalid file, network error, etc.)
- Test performance (large number of items)
- Test accessibility (keyboard navigation, screen readers)

#### 8.6 Performance Testing

- Measure extraction time for PDF
- Measure API response times
- Test with 50+ checklist items
- Optimize if needed

### Deliverables
- ✅ All unit tests passing
- ✅ Integration tests passing
- ✅ Component tests passing
- ✅ End-to-end workflow verified
- ✅ Manual testing completed
- ✅ Performance acceptable
- ✅ Accessibility verified

### Estimated Duration: 4-5 hours

---

## Phase 9: Documentation & Deployment

### Objectives
- Document feature functionality
- Prepare for production deployment
- Create user guides

### Key Tasks

#### 9.1 Code Documentation

- Add JSDoc comments to all functions
- Document component props and usage
- Document API endpoints
- Document database schema

#### 9.2 User Documentation

- **How to Upload Proposal**: Step-by-step guide
- **How to Manage Checklist**: View, edit, complete, delete items
- **How to Reorder Items**: Drag-drop in edit mode
- **How to Edit Item Text**: Click and edit in edit mode
- **Tips & Best Practices**

#### 9.3 Admin Documentation

- **Feature Overview**: What it does and why
- **Database Schema**: Tables and relationships
- **API Endpoints**: All available endpoints
- **Troubleshooting**: Common issues and solutions

#### 9.4 Deployment Checklist

- ✅ All tests passing
- ✅ Code reviewed
- ✅ Database migrations applied
- ✅ Environment variables configured
- ✅ PDF extraction tested with sample
- ✅ UI tested on multiple devices
- ✅ Error handling verified
- ✅ Performance acceptable

#### 9.5 Production Deployment

- Deploy code to production
- Run database migrations
- Test feature in production
- Monitor for errors
- Notify team of successful deployment

#### 9.6 Post-Deployment Monitoring

- Monitor error rates
- Track performance metrics
- Gather user feedback
- Plan improvements

### Deliverables
- ✅ Code documentation complete
- ✅ User documentation complete
- ✅ Admin documentation complete
- ✅ Deployment checklist verified
- ✅ Production deployment successful
- ✅ Monitoring in place

### Estimated Duration: 2-3 hours

---

## Phase 10: Enhancements & Future Features

### Objectives
- Plan for future improvements
- Implement nice-to-have features
- Optimize based on user feedback

### Key Tasks

#### 10.1 Potential Enhancements

- **Multiple Sections**: Extract from multiple sections (Fabrication, Installation, etc.)
- **Batch Upload**: Upload multiple proposals at once
- **Template Support**: Create checklist templates for common projects
- **Collaboration**: Assign items to team members
- **Comments**: Add comments to checklist items
- **Attachments**: Attach files to checklist items
- **Notifications**: Notify team when items are completed
- **Recurring Tasks**: Create recurring checklist items
- **Time Tracking**: Track time spent on each item
- **Progress Charts**: Visual progress indicators

#### 10.2 Performance Optimization

- Implement caching for frequently accessed checklists
- Optimize database queries
- Lazy load large checklists
- Implement virtual scrolling for 100+ items

#### 10.3 User Experience Improvements

- Keyboard shortcuts guide
- Undo/redo functionality
- Bulk operations (mark all complete, delete all, etc.)
- Search/filter items
- Sort by completion status or custom order

### Deliverables
- ✅ Enhancement roadmap documented
- ✅ User feedback collected
- ✅ Prioritized feature list created

### Estimated Duration: Ongoing

---

## Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1. Database & API | 3-4 hrs | Tables, migrations, endpoints |
| 2. PDF Extraction | 4-5 hrs | Extraction service, parser |
| 3. Upload Endpoint | 2-3 hrs | File upload, storage |
| 4. View Mode UI | 3-4 hrs | Checklist display, tick/delete |
| 5. Edit Mode & Drag-Drop | 6-7 hrs | Reordering, inline editing |
| 6. Upload UI | 3-4 hrs | Upload component, status |
| 7. Integration | 2-3 hrs | Component assembly |
| 8. Testing & QA | 4-5 hrs | All tests, manual verification |
| 9. Documentation | 2-3 hrs | Guides, deployment |
| 10. Enhancements | Ongoing | Future features |
| **TOTAL** | **32-41 hours** | **Complete Feature** |

---

## Implementation Order

1. **Phase 1** - Database setup (foundation)
2. **Phase 2** - PDF extraction service (core logic)
3. **Phase 3** - Upload endpoint (backend integration)
4. **Phase 4** - View mode UI (frontend display)
5. **Phase 5** - Edit mode (advanced functionality)
6. **Phase 6** - Upload UI (user interface)
7. **Phase 7** - Integration (assembly)
8. **Phase 8** - Testing (quality assurance)
9. **Phase 9** - Documentation (deployment)
10. **Phase 10** - Enhancements (ongoing)

---

## Success Criteria

✅ PDF proposals can be uploaded and processed
✅ Checklist items are automatically extracted from proposals
✅ Items can be marked as complete/incomplete
✅ Items can be deleted
✅ New items can be added manually
✅ Items can be reordered via drag-drop in edit mode
✅ Item text can be edited inline in edit mode
✅ Changes are persisted to database
✅ UI is responsive and user-friendly
✅ Error handling is robust
✅ Performance is acceptable
✅ All tests passing

---

## UI/UX Notes

- **View Mode**: Clean, read-only display with tick and delete icons
- **Edit Mode**: Canvas-style interface with drag handles and inline editing
- **Transitions**: Smooth animations between modes
- **Feedback**: Loading states, success/error toasts, confirmation dialogs
- **Accessibility**: Keyboard navigation, screen reader support
- **Mobile**: Responsive design that works on all screen sizes

---

## Technical Stack

- **Backend**: Node.js, Express, tRPC
- **Frontend**: React, TypeScript, Tailwind CSS
- **Database**: MySQL/TiDB with Drizzle ORM
- **PDF Processing**: pdf-parse library
- **Drag-Drop**: react-beautiful-dnd
- **UI Components**: Shadcn/ui
- **Testing**: Vitest
- **File Storage**: S3 via storage helpers

---

## Notes

- All proposals follow consistent format (no AI/ML needed)
- Pattern-based extraction using regex
- Database-backed for persistence
- Fully controllable by users
- Scalable design for future enhancements
