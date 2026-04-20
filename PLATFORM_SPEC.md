# Academic Writing Marketplace — Full Platform Specification

## What We're Building
A database-driven platform where students post writing assignments and approved writers bid, accept, and complete them through a structured workflow. University project — all services free tier.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + React + TypeScript | API routes + SSR in one codebase, perfect for role-based dashboards |
| Database | PostgreSQL via Neon (free tier) | Relational, closest free alternative to Oracle — same sequences, triggers, stored procedures, PL/pgSQL |
| DB Driver | `pg` (node-postgres) — no ORM | Raw SQL written by hand — required for DB subject viva, full control over queries |
| Auth | Clerk (free tier) | Fastest setup, handles sessions, roles, JWT |
| File Storage | UploadThing (free tier) | Handles PDF/doc uploads, integrates with Next.js |
| PDF Watermarking | pdf-lib (Node.js library, free) | Stamps student name + order ID on preview copy |
| Real-time Chat | Pusher (free tier: 200 concurrent) | WebSocket chat between student and selected writer |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| Hosting | Vercel (free tier) | Native Next.js hosting |
| Payment | Fake UI only (DB fields simulate escrow) | No real money — uni project demo |

---

## User Roles

### Student
- Signs up freely
- Must select subject(s) of interest on profile setup
- Posts orders, reviews bids, chats with selected writer, accepts/requests revision/requests refund, leaves review

### Writer
- Signs up and fills onboarding form:
  - Select subjects they cover (multi-select, required)
  - Select service types they offer (multi-select, required)
  - Upload sample work
  - Write bio
- Status: `PENDING_APPROVAL` → admin reviews → `APPROVED` or `REJECTED`
- Only approved writers are visible in the pool and can bid

### Admin
- Approves/rejects writer applications
- Views all orders and their statuses
- Handles dispute queue — can override outcomes
- Bans users
- Sets minimum price per page per subject
- Views platform fake earnings dashboard

---

## Tenure Badges (both roles, based on account age)

| Badge | Duration |
|---|---|
| New | 0–29 days |
| 1 Month | 30–89 days |
| Quarterly | 90–179 days |
| Half Year | 180–364 days |
| Veteran | 1 year+ |

---

## Point-Based Ranking System (both roles)

Points accumulate from reviews received. Shown as star rating on profile.

| Tier | Points |
|---|---|
| Bronze | 0–99 |
| Silver | 100–299 |
| Gold | 300–599 |
| Platinum | 600–999 |
| Elite | 1000+ |

- Writers earn points from student reviews after completed orders
- Students earn points from writer reviews after completed orders
- Reviews are **bidirectional** — both sides review each other after completion
- On refund → **neither side can leave a review** (prevents revenge reviews)
- New writers shown as "New Writer" badge until first completed order

---

## Order States (full lifecycle)

```
DRAFT → OPEN → BIDDING → ASSIGNED → IN_PROGRESS
→ SUBMITTED → UNDER_REVIEW → REVISION_REQUESTED
→ COMPLETED | DISPUTED | CANCELLED | REFUNDED
```

---

## Full Order Workflow

### Step 1 — Student Creates Order
Student fills:
- Subject (from allowed list, required)
- Service type (from allowed list, required)
- Topic / title
- Detailed instructions
- File attachments (PDFs, DOCX, images)
- Number of pages
- Preferred deadline
- Academic level (High School / Undergraduate / Masters / PhD)
- Citation style (APA / MLA / Harvard / Chicago / None)

Order saved as `DRAFT`, published as `OPEN`.

---

### Step 2 — Writers Bid
- All approved writers matching the subject see the order in their pool
- Writers submit a bid:
  - Offered price (system enforces minimum price per page set by admin)
  - Proposed deadline
  - Short pitch message
- Multiple writers can bid on the same order
- Order status: `BIDDING`

---

### Step 3 — Student Reviews Bids
- Student sees all bids with:
  - Writer profile card (name, photo, tenure badge, rank tier, star rating, subjects, services)
  - Past completed orders count
  - Reviews from previous students
  - Sample work uploads
  - Their bid price + proposed deadline
- **Chat is NOT available yet** — prevents off-platform deal-making before selection

---

### Step 4 — Student Selects Writer
- Student picks one bid → clicks "Select Writer"
- Fake payment flow triggered:
  - Show card input UI (fake, no real processing)
  - On submit → `Order.paymentStatus = HELD`, `Order.escrowBalance = bid amount`
  - Show confirmation: "Your payment is held securely in escrow"
- Order status: `ASSIGNED`
- Writer notified: "You've been selected for this order"

---

### Step 5 — Chat Unlocks
- Real-time chat (Pusher) opens between student and selected writer
- Messages are scanned for: phone numbers, emails, external URLs
- If detected → message blocked + warning shown: *"Sharing contact info removes your buyer/seller protection"*

---

### Step 6 — Writer Works
- Order status: `IN_PROGRESS`
- Writer sees deadline countdown
- Writer can request a deadline extension → student approves or denies

**If writer misses deadline:**
- Auto-flag to `OVERDUE`
- Student can cancel → full refund (100% back to student, 0% to writer)
- Admin notified

---

### Step 7 — Writer Submits
- Writer uploads final file
- System immediately generates **watermarked preview copy** using pdf-lib:
  - Student's name + order ID stamped on every page
  - Watermark = deterrent against leaking preview
- Order status: `SUBMITTED` → `UNDER_REVIEW`
- Student notified: "Your paper has been submitted. Review it now."

---

### Step 8 — Student Reviews Paper

**Option A — Accept**
- Student clicks "Accept & Download"
- System generates a **one-time expiring download token** (expires in 10 minutes) for the clean original file
- Student downloads clean file
- `Order.paymentStatus = RELEASED_TO_WRITER`
- Platform deducts its commission from escrow before releasing to writer (stored in DB)
- Order status: `COMPLETED`
- Both sides prompted to leave a review (star rating + written comment)

**Option B — Request Revision**
- Student fills structured revision form:
  - What specifically needs to change (required, minimum 50 characters)
  - Which section(s)
- Order status: `REVISION_REQUESTED`
- Writer revises and resubmits → back to Step 7
- **Maximum 3 revisions included**
- After 3 revisions → student must Accept or go to Dispute (no more free revisions)

**Option C — Request Refund**
- Student requests refund with reason
- Split: **70% student / 25% writer / 5% platform** (all fake, reflected in DB)
- Order status: `REFUNDED`
- Neither side can leave a review
- Student cannot download the paper

**Option D — Open Dispute**
- Available after 3 failed revisions or if student believes delivery is completely wrong
- Admin reviews both sides' evidence (original instructions vs. submitted work)
- Admin decides outcome (full refund / partial / release to writer)
- Order status: `DISPUTED` → resolved by admin

---

### Auto-Accept Rule
- If student does not review within **5 days** of submission → paper auto-accepted
- `Order.paymentStatus = RELEASED_TO_WRITER`
- Order status: `COMPLETED`
- Both sides prompted to review

---

## Refund Policy (clear rules)

| Situation | Outcome |
|---|---|
| Writer delivered wrong subject/topic | Full refund to student (100%) |
| Student changed requirements mid-order | No refund — writer keeps full amount |
| Quality dispute (admin decision) | Admin decides split case by case |
| Student refuses without specific reason | 70% student / 25% writer / 5% platform |
| Writer misses deadline / ghosts | Full refund to student (100%) |
| Mutual cancellation (before IN_PROGRESS) | Full refund to student |

---

## File Protection Strategy

**What we implement:**
1. Files never served via direct URL — always through authenticated API route
2. Auth check on every file request (must be the order's student, writer, or admin)
3. Watermarked preview generated server-side on submission (pdf-lib)
4. Clean file only released via one-time expiring token (10 min) on acceptance
5. Deterrence notice shown on preview: *"This preview is watermarked with your identity (Name + Order ID). Sharing it constitutes academic dishonesty and violates platform terms."*

**Honest limitation:** Screenshots and phone cameras cannot be technically prevented. The watermark is a deterrent, not DRM. This is accepted and noted.

---

## Dispute Resolution

Admin dispute dashboard shows:
- Original order instructions
- Submitted file(s)
- Full chat log
- Revision history
- Both sides' statements
- Admin can: full refund / partial split (custom %) / release to writer / ban either user

---

## Chat System

- Provider: Pusher (free tier)
- One chat room per order, created on writer selection
- Participants: student + writer (admin can view all chats)
- Content filter: blocks phone numbers, emails, external links via regex
- Chat log stored in DB for dispute evidence

---

## Minimum Price System

- Admin sets minimum price per page per subject (e.g., STEM = $8/page, General = $5/page)
- Writer bid form validates against this minimum client-side and server-side
- Students see "Estimated minimum: $X" when creating an order

---

## Notification System

Triggers for email/in-app notifications:
- New bid received (student)
- Selected as writer (writer)
- Payment held confirmation (student)
- Paper submitted for review (student)
- Revision requested (writer)
- Paper accepted — payment released (writer)
- Refund processed (student + writer)
- Dispute opened (admin + both parties)
- Deadline approaching — 24h warning (writer)
- Order overdue (admin + student)
- Writer application approved/rejected (writer)
- Auto-accept triggered (student + writer)

---

## Academic Subjects List

**Business & Management**
Business Administration, Marketing, Finance, Accounting, Economics, Human Resource Management, Operations Management, Entrepreneurship, International Business, Supply Chain Management

**STEM**
Mathematics, Statistics, Physics, Chemistry, Biology, Computer Science, Engineering (General), Electrical Engineering, Mechanical Engineering, Civil Engineering, Software Engineering, Data Science, Artificial Intelligence, Environmental Science, Biotechnology

**Social Sciences**
Psychology, Sociology, Political Science, International Relations, Anthropology, Geography, Criminology, Social Work, Public Policy, Gender Studies, Cultural Studies

**Humanities**
English Literature, History, Philosophy, Linguistics, Creative Writing, Journalism, Communication Studies, Media Studies, Religious Studies, Ethics, Art History

**Law & Legal Studies**
Contract Law, Criminal Law, Constitutional Law, International Law, Business Law, Human Rights Law, Environmental Law, Intellectual Property Law

**Health & Medicine**
Nursing, Public Health, Healthcare Management, Pharmacology, Anatomy & Physiology, Medical Ethics, Nutrition & Dietetics, Mental Health, Epidemiology

**Education**
Early Childhood Education, Curriculum Development, Educational Psychology, Special Education, TESOL / ESL, Higher Education

**Arts & Design (written/theory only)**
Architecture Theory, Fashion Studies, Film Studies, Music Theory, Graphic Design Theory

**Other**
General Academic Writing, Interdisciplinary Studies

---

## Writing Service Types

**Essays & Papers**
Essay (Argumentative, Analytical, Descriptive, Narrative, Expository, Compare & Contrast, Cause & Effect, Critical), Research Paper, Term Paper, Position Paper, Reaction/Response Paper, Reflection Paper, Opinion Piece

**Reports**
Lab Report, Case Study Report, Business Report, Technical Report, Field Report, Progress Report, Incident Report, Feasibility Report

**Academic Analysis**
Literature Review, Annotated Bibliography, Critical Analysis, Article/Book/Movie Review, Policy Analysis

**Longer-Form Work**
Thesis / Dissertation (full or by chapter), Thesis Proposal, Research Proposal, Capstone Project (written component)

**Writing Support**
Editing & Proofreading, Paraphrasing / Rewriting, Summarizing, Abstract Writing, Outline Creation, Citation & Referencing (APA / MLA / Harvard / Chicago)

**Coursework & Assignments**
Homework Assignment, Problem Set (written solutions), Case Study Assignment, Discussion Post / Forum Response, Worksheet, Short Answer Questions

**Professional Academic**
Cover Letter (academic), Personal Statement, Statement of Purpose, Scholarship Essay, Internship Report, Academic CV, Grant Proposal, White Paper

**Creative Academic**
Creative Writing Assignment, Short Story, Poetry Assignment, Screenplay/Script (academic), Speech / Presentation Script

**STEM Written Work**
Math Problem Solving (step-by-step written), Statistics Report, Data Analysis Report, Science Essay, Engineering Report, Coding Assignment (written explanation + code)

**Business & Professional**
Business Plan, Marketing Plan, SWOT Analysis, PESTLE Analysis, Financial Analysis Report, Project Management Report, Strategic Management Report

---

## What We Are NOT Building
- No video/audio delivery
- No "attend my class" or "take my exam" services
- No real payment processing (fake UI only)
- No mobile app (web only, responsive)
- No AI writing tools built in

---

## Build Phases

---

### Phase 1 — Database (do this first, most important for viva)
- Design full ER diagram
- Write all `CREATE TABLE` statements with constraints, foreign keys, indexes
- Write sequences for IDs
- Write triggers (auto-update timestamps, auto-flag overdue orders, auto-accept after 5 days, block review on refund)
- Write stored procedures (place bid, select writer, submit paper, accept paper, request refund, open dispute)
- Write views (active orders pool, writer leaderboard, order history per user)
- Seed data (subjects, services, fake users, sample orders)
- Host on Neon, connect via `pg` in Next.js

---

### Phase 2 — Auth + Roles
- Set up Clerk
- Three roles: `student`, `writer`, `admin`
- Role assigned on signup (student = immediate, writer = pending approval)
- Protect all routes and API endpoints by role
- Writer onboarding form (subjects, services, sample work, bio) → status `PENDING_APPROVAL`

---

### Phase 3 — Core Order Flow
- Student: create order form (subject, service, topic, instructions, files, pages, deadline, academic level, citation style)
- Writer pool page: shows all `OPEN` orders matching writer's subjects
- Bid submission form (price validation against minimum, deadline, pitch)
- Student bid review page: see all bids + writer profile cards
- Writer selection + fake payment UI (card form, escrow status flip in DB)

---

### Phase 4 — Active Order Management
- Chat system (Pusher) — unlocks after writer selected, content filter on messages
- Deadline countdown display
- Writer: submit paper (file upload via UploadThing)
- Server-side watermark generation on submission (pdf-lib)
- Student: preview watermarked copy only
- Accept → expiring download token for clean file
- Revision request form (structured, 50 char minimum, max 3 revisions)
- Refund request → 70/25/5 split in DB

---

### Phase 5 — Admin Dashboard
- Writer application queue (approve / reject)
- All orders overview with status filters
- Dispute queue — view evidence (instructions, files, chat log, revision history) → decide outcome
- Ban users
- Set minimum price per page per subject
- Fake earnings/commission tracker

---

### Phase 6 — Profiles + Ranking
- User profile pages (student + writer)
- Tenure badge logic (calculated from `created_at`)
- Point accumulation from reviews → rank tier display
- Writer profile card (shown in bid pool): rating, rank, tenure badge, completed orders, reviews, sample work
- Bidirectional review form after order completion
- Block review on refunded orders

---

### Phase 7 — Notifications + Polish
- In-app notification bell (all trigger events)
- Auto-accept cron job (5 days after submission with no response)
- Overdue order auto-flagging
- Deadline 24h warning
- Responsive UI polish across all pages
- Error states, loading states, empty states
