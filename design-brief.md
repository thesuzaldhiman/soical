# CreatorFlow Dashboard — Design Brief

## Product & Problem Statement
CreatorFlow is a multi-platform social media publishing and automation SaaS app for news creators. Editors need an authoritative command center to monitor scheduled slots, verify delivery health, and queue new breaking dispatches without distraction or visual clutter.

## Primary User & Context of Use
- **Primary Persona**: Senior News Editor / Social Publisher (Suzal Dhiman).
- **Environment**: Desktop / laptop browser, daily repetitive usage, fast-paced workflows where clarity, legible typography, and instant status recognition are vital.

## Visual Design Language: Tasklify Neutral Studio
Inspired by the clean, modern studio aesthetic in `media_1794319246594_18d2be6f.png`:
- **Canvas Background**: Warm neutral off-white `#F8F9FA` or `#F9FAFB` (replaces over-saturated backgrounds).
- **Card Styling**: Pure white `#FFFFFF` cards with crisp subtle borders (`#E2E8F0` / `#E5E7EB`), rounded-2xl radii (`16px`), and soft, airy micro-shadows `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`.
- **Primary Action Buttons**: High-contrast obsidian/black button (`#0F172A` / `#18181B`) with pure white text and crisp icons, matching the `+ Create Task` button in Tasklify.
- **Top Navigation Bar**: Breadcrumb-style title (`Dashboard / Overview`), workspace avatar stack with `+4`, notification bell, settings cog, and primary action button.
- **KPI Cards**: Minimal square icon badge with dark glyph, top-right `View Details >` link, bold large typography (32px font-black), and subtle muted metric labels.
- **Status Pills**: Pill badges with soft background tints (e.g., `#ECFDF5` for success/published, `#EFF6FF` for scheduled, `#FEF2F2` for failed, `#F1F5F9` for draft).
- **Typography**: Clean geometric grotesque hierarchy (Inter/Geist), high contrast text (`#0F172A`), muted secondary text (`#64748B`), and tabular numbers for counts.

## Dashboard Structure (Journey & Hierarchy)
1. **Top Header**: Breadcrumb path (`Dashboard / Overview`), workspace avatar badge, notification bell with status dot, and primary `+ Create Post` button.
2. **Welcome Section**:
   - Title: `Welcome Back, Suzal..!`
   - Subtitle: `Stay on top of your scheduled dispatches, monitor queue health, and manage multi-platform posts.`
3. **4 Core KPI Cards**:
   - Total Accounts (`View Details >`)
   - Connected Channels / Pages (`View Details >`)
   - Published Posts (`View Details >`)
   - Delivery Success Rate (`View Details >` with Anti-Ban active chip)
4. **Content Calendar & Publishing Slots Section**:
   - Header with prominent Selected Date & Total Posts badge:
     `Selected: [Date] • [N] Total Posts`
   - Subtitle showing live status breakdown (published, scheduled, failed).
   - View switcher pill: `Week` / `Month`.
   - 7-Day Week Strip with post count badges on each day (`3 posts`, `1 post`, `0 posts`).
   - Time-slot dispatch queue list for selected date with time, platform icon, post title, target page, and status.
   - Month View interactive grid with clickable dates and instant post listing.
5. **Platform Health & Distribution**:
   - Circular destination breakdown and connected pages overview.
6. **Recent Posts & Dispatch Queue Grid (3-Column Layout)**:
   - Header with status filter pills (`All`, `Published`, `Scheduled`, `Failed`) with live counts.
   - 3-column responsive card layout.
   - Post thumbnail / video player overlay, platform icon, target page name, caption preview, first-comment indicator, publishing timestamp, and 3-dot action dropdown (`Reschedule`, `Retry`, `Delete`).
   - Click card to open full Post Detail Inspection Modal with per-page delivery receipts.

## UX Principles
1. **Clarity Over Flash**: High contrast, crisp borders, and calm neutral surfaces instead of overwhelming gradients.
2. **Every Number is Real**: No hardcoded dummy stats; all counts dynamically derive from actual application data.
3. **Frictionless Error Recovery**: Failed posts are clearly flagged with one-click retry directly from the card menu or inspection modal.
