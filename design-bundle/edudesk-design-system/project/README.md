# EduDesk Design System

## Company Overview
**EduDesk** is an academic writing marketplace where students post writing assignments, verified writers bid, and payments are held in escrow until the student approves the delivered work.

- **Primary users:** Students (post orders) and Writers (bid + deliver)
- **Admin role:** Approves writers, resolves disputes, sets pricing floors
- **Payment model:** Fake escrow for demo (no real money); simulates full escrow/commission logic in DB
- **Tech stack:** Next.js 15 App Router, PostgreSQL (Neon), Clerk auth, Tailwind CSS + shadcn/ui, Pusher, UploadThing

**Source codebase:** `dbproject/` (mounted via File System Access API — Next.js project)

---

## Products / Surfaces
| Surface | Description |
|---|---|
| Landing page | `index.html` — brand homepage with hero, how-it-works, roles, escrow explainer, about, contact |
| Sign up | `sign-up.html` — role-selector (student / writer) then form |
| Sign in | `sign-in.html` — simple email + password form |
| Student dashboard | Orders, new order, leaderboard |
| Writer dashboard | Order pool, my orders, earnings, leaderboard |
| Admin dashboard | Writer approvals, dispute queue, earnings tracker |

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Direct and clear.** No jargon, no fluff. Sentences are short.
- **Professional but warm.** Not corporate-cold, not overly casual. Think: a helpful admin at a university writing centre.
- **Second person ("you")** — always address the user directly. "Post your order", "Review bids", "Your payment is held in escrow."
- **No emoji** in UI copy or headings. Badges use text labels only.
- **Action-oriented CTAs:** "Post your first order free", "Apply as a writer", "Accept & Download", "Request revision". Verbs first.
- **Casing:** Sentence case everywhere (not Title Case in body copy). Proper nouns capitalised normally.
- **Numbers in stats:** Use plain numerals ("10,000+ orders", "98% satisfaction"). Avoid abbreviations like "10k" in formal contexts.

### Example Copy Patterns
- ✅ "Your payment is held securely in escrow"
- ✅ "This preview is watermarked with your identity. Sharing it constitutes academic dishonesty."
- ✅ "Sharing contact info removes your buyer/seller protection"
- ✅ "You've been selected for this order"
- ✅ "What specifically needs to change? (minimum 50 characters)"
- ❌ "Revolutionise your academic journey!" (too marketing-y)
- ❌ "Oops, something went wrong 😅" (no emoji in error states)

---

## VISUAL FOUNDATIONS

### Color System
**Base palette — dark theme only:**
- Background: `#111827` (gray-900) — page background
- Card / panel: `#1f2937` (gray-800)
- Input bg: `rgba(255,255,255,0.05)` (white/5)
- Border: `rgba(255,255,255,0.10)` (white/10)
- Muted text: `#6b7280` (gray-500)
- Secondary text: `#9ca3af` (gray-400)
- Primary text: `#ffffff`

**Primary — Indigo:**
- Action: `#6366f1` (indigo-500)
- Hover: `#818cf8` (indigo-400)
- Accent text: `#a5b4fc` (indigo-300)

**No light mode defined in codebase.** Dark only.

### Typography
- **Display / UI:** DM Sans (Google Fonts substitute for Geist Sans). Weights: 400, 500, 600, 700.
- **Monospace:** DM Mono (substitute for Geist Mono). Used for code, order IDs, tokens.
- **Scale:** xs 12px → base 16px → 7xl 72px. Letter-spacing negative for large headings (−0.03em).
- **Line height:** tight 1.2 for headings, relaxed 1.625 for body.

### Backgrounds
- **Solid dark** (`#111827`) is the default. Alternating sections use `#0f1724` (slightly deeper).
- **Radial gradient glow** behind hero: `rgba(99,102,241,0.18)` ellipse at top-centre. Used sparingly — hero only.
- **Grid overlay** in hero: 1px lines at 48px intervals, masked to fade out. Not used elsewhere.
- **No images, illustrations, or textures** in the current codebase. Purely typographic + iconographic.

### Iconography
- **Source:** No icon font or sprite in the codebase. Icons are **inline SVG** drawn on the fly in components.
- **Style:** Stroke-based, 1.8px stroke-width, rounded linecap/linejoin. Matches Lucide / Heroicons Outline style.
- **CDN substitute:** [Lucide Icons](https://unpkg.com/lucide@latest) — same stroke style, same weight.
- **Size norms:** 18px in inputs/badges, 22px in step cards, 26px in success states.
- **No emoji used** anywhere in UI.

### Spacing & Layout
- 8px base unit. Gaps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px.
- Max content width: `1100px` (sections), `780px` (hero), `560px` (forms/contact), `400px` (auth cards).
- Section vertical padding: `80px` (desktop), `60px` (mobile).
- Header height: `64px` fixed, `backdrop-filter: blur(12px)`.

### Border Radius
- Inputs, buttons: `8px`
- Cards / panels: `12–16px`
- Badge pills: `999px`
- Icon containers: `8–10px`
- Logo mark: `8px`

### Shadows
- Cards: no box-shadow by default — border used instead (`rgba(255,255,255,0.07–0.10)`)
- CTA primary: `0 4px 24px rgba(99,102,241,0.35)` — indigo glow only on primary buttons
- Elevated cards: `0 8px 32px rgba(0,0,0,0.5)`

### Animation & Transitions
- **Default transition:** `150–250ms ease` on color/background/border changes
- **Hover states:** Color lightens (indigo-500 → indigo-400). No scale transforms on most elements.
- **Primary CTA hover:** `translateY(-1px)` + deeper glow shadow — subtle lift.
- **No bounce, spring, or scroll animations** in current codebase. Clean, minimal motion.
- **Loading spinner:** CSS border-top spin at 0.7s linear. Simple.
- **Badge pulse:** `scale(1) → scale(1.4)` at 50% for live-status dot in hero.

### Badges
Two badge types, both use: `text-xs px-2 py-0.5 rounded font-medium` with transparent colour bg + tinted border.

**Rank tiers:** Bronze (amber), Silver (gray), Gold (yellow), Platinum (cyan), Elite (purple)
**Tenure:** Veteran (indigo), Half Year (teal), Quarterly (emerald), 1 Month (sky), New (gray)
**Order status:** Open/Bidding (blue), Assigned/In Progress (indigo), Submitted/Under Review (yellow), Revision (orange), Completed (green), Disputed (red), Cancelled/Refunded (gray)

### Cards
- Background: `#1f2937` or `rgba(255,255,255,0.03–0.05)`
- Border: `1px solid rgba(255,255,255,0.06–0.10)`
- Radius: `12–16px`
- Padding: `24–48px` depending on context
- No drop shadow — border defines the card edge

### Hover States
- **Buttons:** Background lightens (indigo-500 → indigo-400)
- **Ghost buttons:** Background fills with `rgba(255,255,255,0.05–0.07)`
- **Nav links:** Color transitions from gray-400 → white
- **Links:** underline on hover

### Forms / Inputs
- Background: `rgba(255,255,255,0.05)` at rest
- Border: `rgba(255,255,255,0.10)` at rest, `#6366f1` on focus
- Background shift on focus: `rgba(99,102,241,0.05)` — very subtle tint
- Label: `text-xs font-semibold text-gray-400` above input

---

## ICONOGRAPHY
- No built-in icon font or sprite in the codebase
- All icons are inline SVG (stroke-based, Lucide-compatible style)
- For the design system, use **Lucide Icons** via CDN: `https://unpkg.com/lucide@latest`
- Icon sizes: 18px (inline/badge), 22px (card), 24px (standard), 26px (modal/success)
- All stroke icons: `stroke-width: 1.8`, `stroke-linecap: round`, `stroke-linejoin: round`, `fill: none`
- No PNG icons, no emoji, no unicode characters used as icons

---

## File Index
```
/
├── index.html                  Landing page (brand homepage)
├── sign-up.html                Sign up with role selector
├── sign-in.html                Sign in form
├── colors_and_type.css         CSS custom properties — full token system
├── README.md                   This file
├── SKILL.md                    Agent skill definition
├── preview/                    Design System tab cards
│   ├── colors-base.html
│   ├── colors-semantic.html
│   ├── colors-badges.html
│   ├── type-scale.html
│   ├── type-specimens.html
│   ├── spacing-tokens.html
│   ├── components-buttons.html
│   ├── components-inputs.html
│   ├── components-badges.html
│   └── components-cards.html
└── ui_kits/
    └── web/
        ├── README.md
        └── index.html          Interactive prototype (landing → signup → dashboards)
```
