# SOW View Page Reorganization Proposal

## Current Problem
The right column on the SOW view page is overloaded with too many functions:
- Status information
- Approval workflow
- Actions (Recall, Create Revision, Change Order, etc.)
- Comments
- Revision History
- Google Drive integration

This creates a cluttered, hard-to-navigate experience.

## Proposed Solution: Tabbed Interface

### Option 1: Tabs on Main View Page (Recommended)
Reorganize the SOW view page into clear tabs:

**Tab 1: Content** (Default)
- Full-width SOW document view
- Clean, focused reading experience
- No sidebar distractions

**Tab 2: Status & Approvals**
- Current status display
- Approval workflow (if in review)
- Recall functionality
- Approval/rejection details

**Tab 3: Revisions**
- Revision history list
- Create new revision button
- Compare revisions functionality
- Version navigation

**Tab 4: Comments**
- Comments & Discussion section
- Full focus on collaboration

**Tab 5: Actions**
- Create Change Order
- Save to Google Drive
- Download PDF
- Other administrative actions

### Option 2: Separate Management Page
- **View Page**: Clean SOW content only (no sidebar)
- **Management Page**: All administrative functions organized in sections
- Link between the two pages

### Option 3: Collapsible Sections in Sidebar
- Keep sidebar but make sections collapsible
- Better organization with accordion-style sections
- Still keeps everything in one place

## Recommendation: Option 1 (Tabs)

**Benefits:**
- ✅ Clean content view by default
- ✅ Easy navigation between functions
- ✅ Better organization
- ✅ Still all in one place
- ✅ Can add "Print View" that shows only Content tab

**Implementation:**
- Add tab navigation at the top of the page
- Content tab: Full-width, no sidebar
- Other tabs: Can have sidebar or full-width depending on content
- Maintain current URL structure with optional tab parameter

## Questions to Consider:
1. Should the Content tab be full-width or still have a minimal sidebar?
2. Should we keep a "quick actions" bar at the top for common actions?
3. Should tabs be persistent in URL (e.g., `/sow/[id]?tab=revisions`)?

