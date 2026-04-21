# DbProject — Flows & DB Effects

Living document. Every user-facing flow built so far, with the exact database changes that happen when each action fires. Kept in sync as new flows are added.

Legend:
- **UI** — page(s) the user sees
- **Action** — server action or procedure that runs
- **DB writes** — rows inserted/updated directly
- **Triggers that fire** — downstream automatic changes

---

## 1. Authentication

### 1a. Sign up — Student
- **UI:** [/auth/sign-up](app/auth/sign-up/page.js) with intent toggle = Student
- **Action:** [signUpWithEmail](app/auth/sign-up/actions.js) → `auth.signUp.email({ email, name, password })`
- **DB writes:**
  - `neon_auth."user"` — new row (handled by Neon Auth)
- **Triggers that fire:**
  - `trg_auth_user_created` (on `neon_auth."user"`) → inserts into `users` with `role='student'`, `point=0`
- **Redirect:** `/` → role-routed to `/dashboard/student`

### 1b. Sign up — Writer intent
- **UI:** [/auth/sign-up](app/auth/sign-up/page.js) with intent toggle = Writer
- Same DB effect as 1a (`users.role = 'student'` initially — role only flips to `writer` after admin approval).
- **Redirect:** `/writer-onboarding`

### 1c. Sign in
- **UI:** [/auth/sign-in](app/auth/sign-in/page.js)
- **Action:** `auth.signIn.email(...)` — no DB writes to our tables.
- **Redirect:** `/` → role-routed dashboard.

### 1d. Sign out
- **UI:** [LogoutButton](components/LogoutButton.js) on every dashboard + application-status
- **Action:** [signOut](app/auth/sign-out/actions.js) → `auth.signOut()`
- **DB writes:** none (session cookie cleared).
- **Redirect:** `/`

---

## 2. Writer Onboarding

### 2a. Apply to become a writer
- **UI:** [/writer-onboarding](app/writer-onboarding/page.js) — bio, qualification, subject chips, service chips
- **Action:** [submitApplication](app/writer-onboarding/actions.js)
- **DB writes:**
  - `writer` — new row (`id = user uuid`, `status='PENDING_APPROVAL'`)
  - `writer_subject` — one row per selected subject
  - `writer_service` — one row per selected service
- **Redirect:** `/application-status` (pending state)

### 2b. Admin approves a writer
- **UI:** [/admin/writer-applications](app/admin/writer-applications/page.js) — Approve button
- **Action:** [approveWriter](app/admin/writer-applications/actions.js)
- **DB writes:**
  - `writer.status` → `'APPROVED'`
  - `users.role` → `'writer'`
- **Effect:** user can now see `/dashboard/writer`, `/orders/pool`, etc.

### 2c. Admin rejects a writer
- **UI:** Same page — Reject button
- **Action:** [rejectWriter](app/admin/writer-applications/actions.js)
- **DB writes:**
  - `writer.status` → `'REJECTED'`
- **Effect:** `users.role` stays `student`. User sees rejected state on `/application-status`.

---

## 3. Order Lifecycle

### 3a. Student creates order
- **UI:** [/orders/new](app/orders/new/page.js) — title, subject, service, pages, deadline, academic level, citation style, notes
- **Action:** [createOrder](app/orders/new/actions.js) → `INSERT INTO orders (...)`
- **DB writes:**
  - `orders` — new row, `status='OPEN'`, `student_id=current user`, `minimum_price` **placeholder** (overwritten by trigger)
- **Triggers that fire:**
  - `trg_calc_minimum_price` (BEFORE INSERT) → looks up `service.price_of_first_page` + `service.price_of_additional_page × (pages-1)` and overwrites `NEW.minimum_price`
- **Redirect:** `/orders/[id]` (detail page)

### 3b. Writer browses order pool
- **UI:** [/orders/pool](app/orders/pool/page.js)
- **Query only** — no DB writes. Filters to orders where:
  - `status IN ('OPEN','BIDDING')`
  - Writer has a matching `writer_subject.subject_id` AND `writer_service.service_id`

### 3c. Writer places a bid
- **UI:** [/orders/[id]/bid](app/orders/[id]/bid/page.js)
- **Action:** [placeBid](app/orders/[id]/bid/actions.js) → `CALL sp_place_bid(order_id, writer_id, price, deadline)`
- **Procedure effects:**
  - Validates order is `OPEN` or `BIDDING`
  - Validates `price >= orders.minimum_price` (raises exception otherwise)
  - `INSERT INTO bid (...)` with `status='PENDING'`
  - If `orders.status='OPEN'` → `UPDATE orders SET status='BIDDING'`
- **Redirect:** `/orders/[id]`

### 3d. Student accepts a bid (fake payment / escrow)
- **UI:** [/orders/[id]/pay/[bidId]](app/orders/[id]/pay/[bidId]/page.js) — fake card form
- **Action:** [confirmPayment](app/orders/[id]/pay/[bidId]/actions.js)
- **DB writes:**
  - `bid.status` → `'ACCEPTED'` (the chosen bid only)
  - `transactions` — new row, `status='HELD'`, `amount=bid.offered_price`, `release_date=NULL`
- **Triggers that fire:**
  - `trg_bid_accepted` (on `bid`) → for the accepted bid:
    - `orders.writer_id = bid.writer_id`
    - `orders.accepted_bid_id = bid.uuid`
    - `orders.selected_price = bid.offered_price`
    - `orders.status = 'ASSIGNED'`
    - All other `PENDING` bids on the same order → `status='REJECTED'`
- **Redirect:** `/orders/[id]`

### 3e. Writer submits work
- **UI:** [/orders/[id]/submit](app/orders/[id]/submit/page.js) — stub file paths (real upload not wired yet)
- **Action:** [submitPaper](app/orders/[id]/submit/actions.js) → `CALL sp_submit_paper(order_id, file_path, watermarked_path)`
- **Guard:** order status must be `ASSIGNED`, `IN_PROGRESS`, or `REVISION_REQUESTED`
- **Procedure effects:**
  - `count = MAX(submission.count) + 1` for this order
  - `INSERT INTO submission (...)` with `status='PENDING_REVIEW'`, `count=N`
  - `UPDATE orders SET status='SUBMITTED'`

### 3f. Student requests revision
- **UI:** [/orders/[id]/review/revision](app/orders/[id]/review/revision/page.js) — textarea, 50-char minimum
- **Action:** [requestRevision](app/orders/[id]/review/revision/actions.js) → `CALL sp_request_revision(order_id, submission_id, changes)`
- **Guard:** order status must be `SUBMITTED`, fewer than 3 revisions used
- **Procedure effects:**
  - Raises exception if `COUNT(revision) >= 3`
  - `INSERT INTO revision (...)`
  - `UPDATE submission SET status='REVISION_REQUESTED'` (latest submission)
  - `UPDATE orders SET status='REVISION_REQUESTED'`

### 3g. Student accepts work (release funds)
- **UI:** [/orders/[id]](app/orders/[id]/page.js) — **Accept & Release Funds** button when status=`SUBMITTED`
- **Action:** [acceptPaper](app/orders/[id]/review/actions.js) → `CALL sp_accept_paper(order_id)`
- **Procedure effects:**
  - `UPDATE orders SET status='COMPLETED'`
  - `UPDATE submission SET status='ACCEPTED'` (latest)
  - `INSERT INTO transactions` — **2 rows**:
    - `RELEASED_TO_WRITER` — `selected_price × 0.90` (writer share)
    - `SPLIT` — `selected_price × 0.10` (platform fee)
- **Note:** Original file path becomes visible to student after acceptance (UI-gated in detail page).

### 3h. Student requests refund (progressive split)
- **UI:** [/orders/[id]/refund](app/orders/[id]/refund/page.js) — confirmation page; split calculated live from submission count
- **Action:** [requestRefund](app/orders/[id]/refund/actions.js) → `CALL sp_request_refund(order_id)`
- **Guard:** student must own order, status in (`ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `REVISION_REQUESTED`), must have `selected_price`, must have **<3 submissions**
- **Split rule (by submission count):**
  | Subs | Student | Writer | Platform |
  |-----:|--------:|-------:|---------:|
  | 0    | 70%     | 25%    | 5%       |
  | 1    | 50%     | 40%    | 10%      |
  | 2    | 30%     | 60%    | 10%      |
  | 3+   | **refund blocked** — procedure raises exception |
- **Procedure effects:**
  - `UPDATE orders SET status='REFUNDED'`
  - `INSERT INTO transactions` — 3 rows: `REFUNDED` (student %), `RELEASED_TO_WRITER` (writer %), `SPLIT` (platform %)
- **Side effect:** `trg_block_review_on_refund` prevents any review on this order thereafter.

### 3j. Payments / Earnings page (admin + writer)
- **UI:** [/payments](app/payments/page.js) — role-aware
  - **Admin:** all transactions across platform, totals by status (HELD / RELEASED_TO_WRITER / REFUNDED / SPLIT)
  - **Writer:** only own `RELEASED_TO_WRITER` rows for orders where `orders.writer_id = writer.id`, total earnings shown at top
- **DB writes:** none (read-only).
- **Link from:** writer dashboard ("Earnings"), admin dashboard ("Payments")

### 3i. Leave a review (both sides, after COMPLETED)
- **UI:** [ReviewForm](app/orders/[id]/ReviewForm.js) — inline on detail page when status=`COMPLETED` and current user hasn't reviewed
- **Action:** [submitReview](app/orders/[id]/review/actions.js)
- **DB writes:**
  - `review` — new row (`reviewer_id=current user`, `rating 1-5`, `text` optional)
  - `UNIQUE(order_id, reviewer_id)` prevents double-review
- **Triggers that fire:**
  - `trg_review_points` (AFTER INSERT) → adds `rating × 10` to the OTHER party's `users.point`
  - `trg_block_review_on_refund` (BEFORE INSERT) → raises exception if order is REFUNDED
- **Effect:** reviewer's rating is visible to everyone; target's points accumulate toward ranking tiers (Bronze → Elite).

---

## 4. Reference — DB Objects

### Triggers (auto-fire on row events)
| Trigger | Table | Event | Effect |
|---|---|---|---|
| `trg_auth_user_created` | `neon_auth."user"` | AFTER INSERT | Syncs into `users` with default role/point |
| `trg_calc_minimum_price` | `orders` | BEFORE INSERT | Computes `minimum_price` from service + pages |
| `trg_bid_accepted` | `bid` | AFTER UPDATE | On ACCEPTED: assigns order, rejects rival bids |
| `trg_review_points` | `review` | AFTER INSERT | Adds `rating × 10` points to the reviewed user |
| `trg_block_review_on_refund` | `review` | BEFORE INSERT | Raises exception if order is REFUNDED |

### Stored Procedures
| Procedure | Used by |
|---|---|
| `sp_place_bid(order_id, writer_id, price, deadline)` | 3c |
| `sp_submit_paper(order_id, file_path, watermarked_path)` | 3e |
| `sp_request_revision(order_id, submission_id, changes)` | 3f |
| `sp_accept_paper(order_id)` | 3g |
| `sp_request_refund(order_id)` | 3h |

### Views
- `v_order_pool` — unused by UI currently (pool page uses inline query)
- `v_writer_leaderboard` — wired to `/leaderboard`
- `v_user_orders` — not wired
- `v_writer_profile` — not wired

---

## 3k. Ranking & Badges

Every user has two computed badges displayed via `<UserBadges />`:

**Tier** — from `users.point` (see `lib/badges.js`):
| Range | Label |
|---|---|
| 0–99 | Bronze |
| 100–299 | Silver |
| 300–599 | Gold |
| 600–999 | Platinum |
| 1000+ | Elite |

**Tenure** — from `neon_auth."user"."created_at"`:
| Age | Label |
|---|---|
| 0–29 days | New |
| 30–89 | 1 Month |
| 90–179 | Quarterly |
| 180–364 | Half Year |
| 365+ | Veteran |

**Points are awarded only by `trg_review_points`** — `AFTER INSERT` on `review`, it adds `rating × 10` points to `users.point` of the reviewed user (typically the writer). No other flow mutates `users.point`.

**Where badges render:**
- Student & writer dashboards (next to greeting)
- Order detail page → bid list (next to each writer's name)
- Admin writer-applications (tenure badge next to applicant name)
- `/leaderboard` page (top 50 writers, sourced from `v_writer_leaderboard`)

The DB view `v_writer_leaderboard` already ranks approved writers by `point DESC`, and computes `tier` + `tenure_badge` server-side; the client uses it directly plus `completed_orders` and `avg_rating`.

---

## 3l. Notifications

Every user has a notification bell on their dashboard linking to `/notifications`.

**Notification types and who receives them:**

| Type | Trigger | Recipient |
|---|---|---|
| `NEW_BID` | `sp_place_bid` | Student |
| `BID_ACCEPTED` | `trg_bid_accepted_notify` (AFTER UPDATE on bid) | Writer |
| `SUBMISSION_READY` | `sp_submit_paper` | Student |
| `REVISION_REQUESTED` | `sp_request_revision` | Writer |
| `PAPER_ACCEPTED` | `sp_accept_paper` | Writer |
| `ORDER_REFUNDED` | `sp_request_refund` | Writer |
| `NEW_REVIEW` | `trg_review_notify` (AFTER INSERT on review) | Writer |

All notifications are inserted into the `notification` table by `fn_notify(user_id, order_id, type, text)`.

**`/notifications` page** — lists all for the current user, newest first. Unread rows have an indigo highlight. "Mark all read" sets `read_at = CURRENT_TIMESTAMP` on all unread rows. Each row links to the order.

**Requires migration 002** (`db/migrations/002_notifications.sql`) to be run in Neon.

---

## 5. Not Yet Built

- Admin disputes dashboard
- Chat per order
- Real file upload (UploadThing) + watermarking (pdf-lib) — currently stubbed as text paths in submissions

---

*Last updated: after notifications.*
