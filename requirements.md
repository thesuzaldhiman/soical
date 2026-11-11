# CreatorFlow (Social Auto Poster Pro SaaS) — Requirements

## Summary
CreatorFlow is a high-volume, anti-ban social media auto-publishing and scheduling SaaS platform designed for regional news publishers, creators, and media agencies. It enables frictionless publishing across Facebook Pages, Instagram, YouTube Shorts, Telegram, and Threads from a single unified workspace.

## Problem Framing
### Problem Statement
Independent creators and digital news publishers need a reliable, anti-ban multi-platform command center to manage high-frequency social dispatches because native publishing interfaces flag rapid posts, degrade reach with external links, and lack centralized scheduling across diverse platforms.

### Primary User Snapshot
- **User**: Regional digital news editor & creator (e.g. Suzal Dhiman at Khabar Monkey Media).
- **Context**: Rapid daily publishing (20–100 posts/day) across 15–25 social pages/channels, often under tight breaking-news deadlines on desktop.
- **Core Frustrations**: Platform security checks (OAuth blocks/bans), manual copy-pasting across 5 networks, downranking due to links in captions, and losing track of what is scheduled versus published.

### Key Scenarios
1. **Morning News Blast**: Editor opens the dashboard at 8:30 AM to inspect the day's scheduled timeline, ensure no overnight dispatch failures occurred, and view total scheduled posts for the day.
2. **Breaking News Insertion**: An urgent story breaks; editor uses "+ Create Post" to compose, run anti-ban sanitization, set first-comment link trigger, and queue it immediately.
3. **Queue Health & Error Recovery**: One post fails due to Meta token refresh; editor spots the red status badge in Recent Posts Grid, opens the dispatch details modal, reads the error, and retries in 1 click.

### How Might We
- HMW give publishers instant visibility into today's publishing pipeline and queue density at a single glance?
- HMW make error detection and recovery frictionless without digging through technical server logs?
- HMW blend high information density with the clean, elevated aesthetic of modern studio tools (Tasklify style)?

## Problem & Goals
- **Pain Points**: Fragmented social channels, Meta automated spam flags, lack of unified schedule visibility.
- **Success Metrics**: 
  - 100% dispatch visibility with 0 missed scheduled slots.
  - Sub-3-second time to identify failed dispatches and retry them.
  - Zero cognitive clutter on the dashboard command center.

## Core Decisions (From Kickoff Interview)
1. **Mental Model**: Publishing Pipeline & Schedule First (Calendar + Queue overview).
2. **Calendar Interactivity**: Interactive 7-Day Week Strip with post counts per day + Month density switcher.
3. **Recent Activity**: 3-Column Responsive Visual Grid with image/video thumbnails, channel badges, first-comment flags, and 3-dot action dropdowns.
4. **Visual Language**: **Tasklify Clean Neutral Studio** — Crisp white cards, refined neutral slate borders (`#E2E8F0`), high-contrast dark primary buttons (`#0F172A`), subtle badges, and clean typography.

## Scope
### Must Have
- Welcome greeting & workspace context with primary `+ Create Post` action.
- 4 Core KPI cards with `View Details >` link (Active Accounts, Connected Pages, Published Posts, Delivery Success Rate).
- Interactive Content Calendar with selected date headline, total post count pill, 7-day strip with post counts, and day timeline slots.
- Responsive 3-Column Recent Posts & Dispatch Queue Grid with status filters (`all`, `published`, `scheduled`, `failed`).
- Detailed Post Inspection Modal with per-page delivery receipts.

### Won't Have (This Version)
- Unconnected AI generators or fake LLM copywriters (removed per user directive).
- Complex analytics charts on the main dashboard (reserved for `/analytics`).

## Decision Log
| Decision | Options Considered | Chosen | Why |
|---|---|---|---|
| Dashboard Focus | Pipeline-first vs Kanban vs Metrics-first | Pipeline-first | News creators need to see what's scheduled today at a glance |
| Visual Grid | Dense table vs Visual Grid vs Feed | Visual Grid | Visual verification of post media & platform badges is essential |
| Aesthetic | CreatorFlow Neon vs Tasklify Neutral vs Dark Mode | **Tasklify Neutral Studio** | User selected clean slate/gray borders, refined padding, and crisp studio layout |
