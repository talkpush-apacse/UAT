# Analytics events (Mixpanel)

Mixpanel project: **UAT Tool** (id 4056463). Code: `src/lib/mixpanel.ts` (all
events go through it) and `src/components/analytics/mixpanel-tracker.tsx`
(page views + the global click listener).

Events are only sent when `NODE_ENV === "production"` and
`NEXT_PUBLIC_MIXPANEL_TOKEN` is set (Vercel **Production** scope only). In local
dev, every event is printed to the browser console as `[mixpanel:dev]` instead.

## Privacy rules

- Testers are never `identify`'d. Admins are identified by Supabase user id.
- Never send: tester name, email, phone, comment text, file names, typed form
  values, or raw error messages/stack traces.
- Send only: ids, step numbers, counts, and the short enums listed below.
- Raw errors go through `errorCategoryFor()` before being tracked.

## Naming

- Event names: Title Case, `Object Verb` in past tense (`Step Status Set`,
  `Attachment Upload Failed`).
- Property names: `snake_case`.
- Don't rename or remove an existing event or property; reports depend on
  them. Add new ones instead.

## Properties added to every event

| Property | Values |
|---|---|
| `path` | URL path, e.g. `/test/acme-uat/checklist` |
| `area` | `admin` \| `tester` \| `other` |

## Events

### `Page View`
Fired on every route change. Properties: `path`, `area`.

### `Button Clicked`
Fired for every click on a `button` or `[role="button"]`. Property `label`
is chosen in this order:

1. `data-track` attribute: a stable analytics name, set where the visible or
   accessible name contains variable data (step numbers, file names)
2. Known third-party widgets: the phone flag picker → `Phone country picker`
3. `aria-label`
4. Visible text
5. `title`
6. `Unlabeled button`

`data-track` names currently in use: `Remove attachment`, `Jump to step`,
`Edit step`, `Duplicate step`, `Delete step`, `Version history`.

### `Step Status Set`
A tester picks, changes or clears a step's status (not fired in preview mode).

| Property | Values |
|---|---|
| `project_slug` | checklist slug |
| `step_id` | `checklist_items.id` |
| `step_number` | displayed step number |
| `step_position` | 1-based position among answerable steps (headers excluded) |
| `total_steps` | answerable steps in the checklist |
| `view_mode` | `classic` \| `wizard` |
| `status` | `Pass` \| `Fail` \| `N/A` \| `Blocked` \| `Up For Review` \| `null` (cleared) |
| `previous_status` | same values; `null` = first answer |

### `Test Completed`
"Mark My Test as Complete" / "Submit & Mark Complete" succeeded.
Properties: `project_slug`, `view_mode`, `total_steps`, `pass`, `fail`, `na`,
`blocked`, `review` (counts). To see how long a test took, use a funnel from
the first `Step Status Set` to `Test Completed` and read its time to convert.

### `Response Save Failed`
Saving a status or comment failed (the step shows "Error").
Properties: `project_slug`, `step_number`, `view_mode`,
`save_kind` (`status` \| `comment`), `error_category`.

### `Attachment Upload Failed`
One event per file that failed.
Properties: `project_slug`, `step_number`, `view_mode`, `stage`,
`file_kind` (`image` \| `pdf` \| `doc` \| `other`), `file_count` (files in
that upload batch).

`stage`: `file_type` (unsupported type) \| `file_size` (over 10MB) \|
`upload_url` (couldn't get an upload link) \| `storage` (upload to storage
failed) \| `save_record` (file uploaded but saving its record failed) \|
`network`.

### `Mark Complete Failed`
Properties: `project_slug`, `view_mode`, `error_category`, which here can
also be `missing_evidence` (a flagged step still needs a comment or
screenshot).

### `Registration Failed`
Properties: `project_slug`, `reason`, `fields`.

`reason`: `form_check` (blocked in the browser) \| `server_check` (server
validation) \| `already_registered` \| `server_error`.
`fields`: names only, e.g. `["email", "mobile"]`.

## `error_category`

`network` \| `validation` \| `storage` \| `not_found` \| `unknown`

## Known gaps

- Admin server-action failures (checklist save/delete/reorder) are not
  tracked yet; they show a toast only.
- The share-link token appears in `Page View.path` and in Mixpanel's automatic
  `$current_url` for `/share/analytics/[slug]/[token]`. Tester pages'
  `$current_url` also includes `?tester=<id>`. Planned as a separate
  privacy fix.
