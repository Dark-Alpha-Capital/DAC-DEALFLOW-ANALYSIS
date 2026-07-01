# Session Changes — Plane.so UI Mirror (2026-06-30)

## Goal
Mirror Plane.so's project management UI/UX into the internal project tracker app, element by element. This session implements features on top of the lead's latest commits (up to `30ad4b3`).

---

## 1. Priority System (Full Stack)

### New enum — `packages/enums/work-item-priority.ts`
- Added `WorkItemPriority` const object, `WORK_ITEM_PRIORITY_VALUES`, `DEFAULT_WORK_ITEM_PRIORITY`, `WORK_ITEM_PRIORITY_LABELS`
- Values: URGENT, HIGH, MEDIUM, LOW, NONE
- Exported from `packages/enums/index.ts`

### DB Schema — `packages/db-tracker/schema.ts`
- Added `priority` column to `workItems` table (text, enum of WORK_ITEM_PRIORITY_VALUES, default "NONE", NOT NULL)

### Migration — `packages/db-tracker/drizzle/0004_add_work_item_priority.sql`
```sql
ALTER TABLE `WorkItem` ADD `priority` text DEFAULT 'NONE' NOT NULL;
```
- Journal updated in `packages/db-tracker/drizzle/meta/_journal.json` (idx=4)

> **ACTION REQUIRED**: Run `wrangler d1 migrations apply <db-name> --remote` to apply to production D1.

### Zod Schemas — `packages/schemas/work-items.ts`
- Added `workItemPrioritySchema = z.enum(WORK_ITEM_PRIORITY_VALUES)`
- Added `priority` field (default "NONE") to `createWorkItemSchema`
- Added `priority` field (optional) to `updateWorkItemSchema`

### DB Queries — `packages/db-tracker/queries/work-items.ts`
- Added `priority` to `WorkItemRecord` type

### DB Mutations — `packages/db-tracker/mutations/work-items.ts`
- Added `priority?: WorkItemPriorityValue` to `CreateWorkItemInput`
- Added `priority?: WorkItemPriorityValue` to `UpdateWorkItemInput`
- `createWorkItem` inserts `priority` with default "NONE"
- `updateWorkItem` patches `priority` when provided

### tRPC Router — `apps/project-trackers/trpc/routers/work-items.ts`
- `create` procedure now passes `priority` through to `createWorkItem`
- `update` procedure automatically passes through (uses spread)

---

## 2. Display Utilities — `apps/project-trackers/lib/work-item-display.ts`

New functions added:
- `workItemStatusDotClass(status)` — returns Tailwind classes for Plane-style status circles (dashed ring for Backlog, solid ring for Todo, filled for In Progress/Done/Cancelled)
- `workItemPriorityLabel(priority)` — returns human-readable label
- `workItemPriorityColor(priority)` — returns text color class (red/orange/yellow/blue/slate)
- `workItemPriorityBgClass(priority)` — returns bg+text+border class for badges

---

## 3. Work Items Panel — `apps/project-trackers/components/work-items/work-items-panel.tsx`

**Full redesign** to match Plane's UI. Key changes:

### Priority icons (inline components)
- `StatusCircle` — small colored circle/ring that shows work item state
- `PriorityIcon` — Lucide icon mapped per priority level:
  - URGENT → AlertCircle (red)
  - HIGH → ArrowUp (orange)
  - MEDIUM → ArrowRight (yellow)
  - LOW → ArrowDown (blue)
  - NONE → Minus (slate)

### Pill-button create/edit form (Plane-style)
- Title is a bare `<input>` (no border, large text) — like Plane's issue title
- Description uses existing MarkdownEditor
- Tags input below description
- **Bottom bar** replaces stacked form fields: pill buttons for Status, Priority, Start date, Due date, Epic (if any), Cycle (if any), Module (if any)
- Cancel and Create/Save buttons on the right of the pill bar

### List view — Grouped compact rows (replaces card layout)
- Items grouped by status: Backlog → Todo → In Progress → Done → Cancelled
- Each group: chevron toggle (collapse/expand) + status circle + name + count
- Each row: status circle + title + priority icon + due date (red if overdue) + tags
- Hover reveals edit/delete buttons
- Click row opens detail sheet

### Table view (NEW)
- Toggle between list/table via `LayoutList`/`Table2` icon buttons in toolbar
- Columns: Title, State, Priority, Start date, Due date, Tags, Updated
- Compact rows with status circle + priority icon inline
- Hover reveals edit/delete
- Click opens detail sheet

### Detail sheet improvements
- Header shows status circle + priority icon + title
- Details tab now shows Priority, Start date, Due date, estimates, tags, description

---

## 4. Route URL Tab Params — `apps/project-trackers/src/routes/_app/project-trackers/$trackerId.tsx`

- Added `validateSearch` with `tab` param (validates to one of: work-items, epics, cycles, modules, ai-scoring, project-info; defaults to work-items)
- Tabs component is now **controlled** via `Route.useSearch()` and `Route.useNavigate()`
- Clicking a tab updates the URL: `/project-trackers/abc123?tab=cycles`
- Direct URL navigation to a tab works (browser back/forward too)

---

## 5. Nested Sidebar — `apps/project-trackers/components/sidebars/project-trackers-sidebar.tsx`

**Full redesign** to Plane-style nested navigation:

### Workspace level (when NOT inside a tracker)
- All Projects
- New Kickoff
- ── separator ──
- Screeners
- Initiatives
- Analytics

### Project level (when inside `/project-trackers/$trackerId`)
- ← All Projects (back link)
- ── separator ──
- **[Project Name]** (fetched from `trpc.projectTrackers.getById`)
  - Work Items
  - Epics
  - Cycles
  - Modules
  - AI Scoring
  - Project Info
- ── separator ──
- Workspace: Screeners, Initiatives, Analytics

Active tab is highlighted based on the `?tab=` URL search param read from `useRouterState`.

---

## Files Modified

| File | Change |
|------|--------|
| `packages/enums/work-item-priority.ts` | NEW — priority enum |
| `packages/enums/index.ts` | EDIT — export priority enum |
| `packages/db-tracker/schema.ts` | EDIT — `priority` column on `workItems` |
| `packages/db-tracker/drizzle/0004_add_work_item_priority.sql` | NEW — migration |
| `packages/db-tracker/drizzle/meta/_journal.json` | EDIT — add idx=4 entry |
| `packages/schemas/work-items.ts` | EDIT — add priority to Zod schemas |
| `packages/db-tracker/queries/work-items.ts` | EDIT — add priority to WorkItemRecord |
| `packages/db-tracker/mutations/work-items.ts` | EDIT — add priority to create/update |
| `apps/project-trackers/trpc/routers/work-items.ts` | EDIT — pass priority in create |
| `apps/project-trackers/lib/work-item-display.ts` | EDIT — add priority + status dot utils |
| `apps/project-trackers/components/work-items/work-items-panel.tsx` | FULL REWRITE |
| `apps/project-trackers/src/routes/_app/project-trackers/$trackerId.tsx` | EDIT — validateSearch + controlled tabs |
| `apps/project-trackers/components/sidebars/project-trackers-sidebar.tsx` | FULL REWRITE |

---

## What Was NOT Done (Lead is handling / future work)

- Kanban board (lead is building this)
- Sidebar URL-based active tab may need routeTree regeneration (run dev server once)
- Apply DB migration to production D1 (`wrangler d1 migrations apply`)
- Assignees / user assignment on work items
- Label colors (tags are plain strings, not colored)
- Full-page issue detail view (currently right-side sheet only)
