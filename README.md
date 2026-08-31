# MemCall — Product Requirements Document (PRD)
## AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients (NER)

**Version:** 1.1 *(Updated — Tech Stack Refinements)*  
**Date:** August 2026  
**Product Name:** MemCall  
**Target Region:** North Eastern Region (NER), India  
**Document Type:** Full-Stack Application Plan (Web + Android Native)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Tech Stack & Architecture](#3-tech-stack--architecture)
   - 3.1 Frontend *(updated)*
   - 3.2 Backend
   - 3.3 AI/ML Layer
   - 3.4 Mobile
   - 3.5 Deployment
   - 3.6 Framework Decision Rationale *(new)*
   - 3.7 High-Level Architecture Diagram
4. [User Personas](#4-user-personas)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Application Structure & Navigation](#6-application-structure--navigation)
7. [Authentication & Onboarding Flow](#7-authentication--onboarding-flow)
8. [Patient-Facing Feature Specifications](#8-patient-facing-feature-specifications)
   - 8.1 Patient Dashboard
   - 8.2 Cognitive Games Module *(updated — game rendering strategy)*
   - 8.3 AI Adaptation Engine
   - 8.4 Voice & Multilingual Interface
   - 8.5 Reminder & Alert System
   - 8.6 Offline Mode & Sync *(updated — Workbox strategy)*
   - 8.7 Profile & Settings
9. [Caregiver-Facing Feature Specifications](#9-caregiver-facing-feature-specifications)
10. [Admin Panel Specifications](#10-admin-panel-specifications) *(updated — shadcn/ui)*
11. [Database Schema (Supabase)](#11-database-schema-supabase)
12. [API & Integration Architecture](#12-api--integration-architecture)
13. [Design System & UI/UX Guidelines](#13-design-system--uiux-guidelines)
14. [Android (Capacitor) Specifics](#14-android-capacitor-specifics)
15. [Complete Dependency List](#15-complete-dependency-list-packagejson) *(new)*
16. [Deployment Strategy](#16-deployment-strategy)
17. [Security & Privacy Requirements](#17-security--privacy-requirements)
18. [Non-Functional Requirements](#18-non-functional-requirements) *(updated — elderly performance checklist)*
19. [Future Enhancements (Phase 2+)](#19-future-enhancements-phase-2)

---

## 1. Executive Summary

MemCall is a full-stack AI-powered cognitive gaming and memory assistance platform designed specifically for elderly dementia patients in the North Eastern Region (NER) of India. The platform bridges the gap between limited neurological care infrastructure and the growing cognitive health needs of elderly populations in remote and rural areas.

The application provides adaptive cognitive games, voice-assisted multilingual interaction in regional NER languages, medicine/activity reminders, caregiver monitoring dashboards, and offline-first functionality — all wrapped in an elderly-friendly interface with large text, high contrast, and simplified navigation.

MemCall is delivered as:
- A **progressive web application** (PWA) accessible from any browser on desktop or mobile
- A **native Android APK** via Capacitor, with status bar and navigation buttons preserved for a natural Android experience

---

## 2. Product Vision & Goals

### 2.1 Problem Statement
- Elderly dementia patients in NER face memory decline, confusion, anxiety, and social isolation
- Caregivers lack tools for continuous engagement and monitoring
- Limited access to specialized neurological care due to geography and infrastructure gaps
- No culturally inclusive digital therapeutic tool tailored for NER elderly users

### 2.2 Product Vision
To be the most accessible, culturally familiar, and medically meaningful cognitive wellness companion for elderly dementia patients in Northeast India — usable even in low-connectivity, remote environments.

### 2.3 Goals
- Improve cognitive engagement through daily interactive games
- Reduce caregiver burden through automated monitoring and alerts
- Provide early cognitive decline signals to healthcare workers
- Ensure usability for users with limited tech literacy
- Support 8+ NER regional languages via voice and text
- Work in offline/low-bandwidth conditions

### 2.4 Success Metrics
- Daily active users (DAU) among patient cohort
- Average daily game session duration
- Reminder acknowledgment rate
- Caregiver login frequency
- Cognitive score trend (tracked weekly per patient)
- App retention at 30/60/90 days

---

## 3. Tech Stack & Architecture

### 3.1 Frontend
| Layer | Technology | Notes |
|---|---|---|
| UI Framework | React 18 + Vite | — |
| Styling | Tailwind CSS | — |
| UI Components (Admin) | shadcn/ui | Pre-built accessible components for admin panel; saves build time |
| UI Components (Patient) | Custom Tailwind primitives | Fully custom — elderly UX requires bespoke sizing, touch targets, layouts |
| Server State Management | **TanStack Query (React Query)** | Handles all Supabase data fetching, caching, background sync, optimistic updates |
| UI State Management | Zustand *(UI only)* | Modal states, language selection, theme — no server data |
| Routing | React Router v6 | — |
| Code Splitting | React.lazy() + Suspense | Per-route and per-game-module lazy loading; critical for performance on budget Android devices |
| Offline Storage | IndexedDB via Dexie.js | — |
| PWA / Service Worker | vite-plugin-pwa + **Workbox** (configured) | Workbox strategy required: game assets + audio pre-cached with `CacheFirst`; API calls use `NetworkFirst` |
| Voice API | Web Speech API + custom NER language pack integration | — |
| Animations (UI/Transitions) | Framer Motion | Page transitions, card flips, modal animations |
| Game Rendering (Canvas games) | **react-konva** | Used for Shape Sorter, Spot the Difference, Color Trail — smooth 60fps canvas rendering |
| Forms | React Hook Form + Zod | — |

### 3.2 Backend
| Layer | Technology |
|---|---|
| Backend-as-a-Service | Supabase |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth (email+password) |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime (caregiver alerts) |
| Edge Functions | Supabase Edge Functions (Deno) for AI calls |

### 3.3 AI/ML Layer
| Component | Technology |
|---|---|
| Difficulty Adaptation | Rule-based scoring engine (Phase 1) → Claude API / OpenAI (Phase 2) |
| Voice Interaction | Web Speech API + custom vocabulary |
| Cognitive Score Computation | Supabase Edge Function |
| Anomaly Detection | Rolling average deviation (server-side) |

### 3.4 Mobile
| Layer | Technology |
|---|---|
| Native Wrapper | Capacitor 6 |
| Platform | Android (minSDK 26 / Android 8+) |
| Android Fullscreen | DISABLED — Status bar + nav buttons always visible |
| Plugins | @capacitor/status-bar, @capacitor/local-notifications, @capacitor/network, @capacitor/splash-screen |
| Build | Android Studio / Gradle |

### 3.5 Deployment
| Target | Platform |
|---|---|
| Web | Vercel (production + preview deployments) |
| Android APK | GitHub Actions CI → signed APK release |
| DB/Auth/Storage | Supabase cloud (free/pro tier) |
| CI/CD | GitHub Actions |

### 3.6 Framework Decision Rationale

**Why React + Vite (and NOT Next.js or SvelteKit):**

| Decision | Reason |
|---|---|
| React over Vue/Svelte | Best-in-class Capacitor documentation and plugin examples use React; Supabase has official React hooks; largest ecosystem for solving edge cases |
| Vite over CRA / Webpack | Fastest dev server HMR; native ES modules; optimal production build output for Capacitor |
| **NOT Next.js** | Capacitor wraps a static/client-side build into an APK. Next.js's SSR (server-side rendering) cannot run inside an Android APK — Capacitor has no Node.js server. Using Next.js would require maintaining two separate codebases (Next.js for web, plain React for Android), defeating the single-codebase goal |
| TanStack Query over Zustand-only | Zustand manages UI state well but is not designed for server state (fetching, caching, refetching, background sync). TanStack Query solves all server data concerns automatically, reducing manual fetch logic significantly |
| shadcn/ui for Admin only | Admin panel benefits from pre-built accessible components (tables, dialogs, dropdowns) that save development time. Patient UI requires fully custom components for elderly-specific sizing, touch targets, and interaction patterns that no generic library provides |
| react-konva for canvas games | DOM-based React rendering causes frame drops for complex animated game states. react-konva uses HTML5 Canvas which runs at native 60fps, critical for elderly users who notice lag |
| Workbox (configured) over bare PWA plugin | vite-plugin-pwa installs a Service Worker but the caching strategy must be explicitly configured. Without Workbox strategy setup, game audio and images are NOT reliably available offline — defeating a core requirement |

### 3.7 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              CLIENT LAYER                   │
│  ┌───────────────┐    ┌───────────────────┐ │
│  │  React + Vite │    │  Capacitor (APK)  │ │
│  │  (Web / PWA)  │    │  Android Native   │ │
│  └──────┬────────┘    └────────┬──────────┘ │
└─────────┼────────────────────┼─────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────┐
│              SUPABASE LAYER                 │
│  ┌──────────┐  ┌────────┐  ┌────────────┐  │
│  │   Auth   │  │  DB    │  │  Storage   │  │
│  │          │  │(PostGR)│  │ (audio/img)│  │
│  └──────────┘  └────────┘  └────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Realtime        │  │  Edge Functions  │ │
│  │  (caregiver push)│  │  (AI scoring)    │ │
│  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│          EXTERNAL AI SERVICES               │
│  Claude API / OpenAI (Phase 2 only)         │
└─────────────────────────────────────────────┘
```

---

## 4. User Personas

### Persona 1 — The Elderly Patient
- **Name:** Mohan Bora, 74, Assam
- **Cognitive status:** Mild-to-moderate dementia
- **Tech literacy:** Very low; used basic feature phones
- **Needs:** Simple, large-text interface; voice guidance; no confusion; culturally familiar visuals
- **Pain points:** Forgets medicine; struggles to remember names and events; anxiety from confusion

### Persona 2 — The Family Caregiver
- **Name:** Priya Bora, 42, daughter
- **Location:** Works in Guwahati; visits monthly
- **Tech literacy:** Moderate (uses WhatsApp, basic apps)
- **Needs:** Daily progress summary; medicine non-compliance alerts; activity history
- **Pain points:** Cannot monitor father daily; worried about falls/confusion episodes

### Persona 3 — The Healthcare Worker
- **Name:** Dr. Ranjita Devi, 38, district hospital, Manipur
- **Role:** Geriatric nurse / ASHa worker
- **Needs:** Aggregate patient view; cognitive trend charts; exportable reports
- **Pain points:** Limited time per patient; needs quick clinical overview

### Persona 4 — The Admin
- **Name:** System Admin
- **Access:** Full backend control
- **Needs:** User management, analytics, system health, content moderation
- **Tech literacy:** High (developer or IT staff)

---

## 5. User Roles & Permissions

| Permission | Patient | Caregiver | Admin |
|---|---|---|---|
| Play cognitive games | ✅ | ❌ | ❌ |
| View own cognitive scores | ✅ | ❌ | ❌ |
| Set reminders (own) | ✅ | ✅ (for linked patient) | ❌ |
| View assigned patient data | ❌ | ✅ | ✅ |
| Edit patient profile | ❌ | ✅ (limited) | ✅ |
| Delete account | ❌ | ❌ | ✅ |
| Manage all users | ❌ | ❌ | ✅ |
| View platform analytics | ❌ | ❌ | ✅ |
| Upload cultural content | ❌ | ❌ | ✅ |
| Access admin panel | ❌ | ❌ | ✅ |

---

## 6. Application Structure & Navigation

### 6.1 User-Facing Application — Route Map

```
/                          → Landing / Splash
/auth/signin               → Login page
/auth/signup               → Registration flow (multi-step)
/auth/forgot-password      → Password reset
/onboarding                → Post-registration setup wizard
/patient/dashboard         → Patient home screen
/patient/games             → Game selection lobby
/patient/games/:gameId     → Active game screen
/patient/reminders         → Reminder list
/patient/profile           → Patient profile & settings
/caregiver/dashboard       → Caregiver home screen
/caregiver/patients        → Linked patient list
/caregiver/patients/:id    → Individual patient detail view
/caregiver/reminders/:id   → Manage patient reminders
/caregiver/reports/:id     → Cognitive progress reports
```

### 6.2 Admin Panel — Route Map

```
/admin/login               → Admin login (fixed credentials)
/admin/dashboard           → Overview analytics
/admin/users               → All users list
/admin/users/:id           → Single user detail + actions
/admin/patients            → Patient-specific management
/admin/caregivers          → Caregiver management
/admin/games               → Game content management
/admin/reminders           → System-wide reminder stats
/admin/reports             → Exportable analytics reports
/admin/settings            → System settings
```

### 6.3 First-Time Admin Setup

```
/admin/setup               → One-time admin creation (email + password)
                             → Accessible only when no admin exists in DB
                             → After completion, route is permanently disabled
```

---

## 7. Authentication & Onboarding Flow

### 7.1 Registration Flow (Multi-Step)

The registration is split into logical steps displayed as a progress-indicated multi-page form.

---

#### Step 1 — Personal Information
**Fields:**
| Field | Type | Validation |
|---|---|---|
| Full Name | Text input | Required, min 2 chars, max 60 chars, letters + spaces only |
| Email Address | Email input | Required, valid email format, unique in DB |
| Date of Birth | Date picker | Required, must be at least 18 years old |
| Gender | Single select radio | Options: Male / Female / Prefer not to say |

**UI Behavior:**
- Large text labels (elderly-friendly sizing)
- Helper text below each field
- Real-time inline validation (on blur)
- DOB picker shows year selector prominently (elderly users born in 1940s–1960s)

---

#### Step 2 — Account Security
**Fields:**
| Field | Type | Validation |
|---|---|---|
| Password | Password input (toggle visibility) | Min 8 chars, at least 1 number, at least 1 uppercase |
| Confirm Password | Password input | Must match password exactly |

**UI Behavior:**
- Password strength indicator (weak / moderate / strong)
- Visibility toggle on both fields
- "Confirm" button disabled until both fields pass validation

---

#### Step 3 — Role Selection
**Fields:**
| Field | Type | Description |
|---|---|---|
| I am a... | Card-style selector | Option A: "Patient (I have memory difficulty)" / Option B: "Caregiver (I support a patient)" |

**UI Behavior:**
- Two large illustrated cards
- Selected card highlighted with black border
- Short description beneath each option in simple language

---

#### Step 4A — Patient Setup (if Patient role selected)
**Fields:**
| Field | Type | Description |
|---|---|---|
| Preferred Language | Dropdown | English, Hindi, Assamese, Bengali, Manipuri, Mizo, Nagamese, Bodo |
| Cognitive Concern Level | Slider / select | Mild forgetfulness / Moderate memory loss / Severe decline (for difficulty calibration) |
| Primary Caregiver Name | Text (optional) | Name of caregiver to link later |
| Primary Caregiver Email | Email (optional) | Will send an invite link |

---

#### Step 4B — Caregiver Setup (if Caregiver role selected)
**Fields:**
| Field | Type | Description |
|---|---|---|
| Relationship to Patient | Dropdown | Family member / Healthcare worker / ASHA worker / Volunteer |
| Patient Email (to link) | Email input | Must match an existing patient account in DB |

---

#### Step 5 — Review & Submit
- Summary of all entered information
- "Terms & Conditions" checkbox (simple language summary)
- "Privacy Policy" checkbox
- Submit button → creates Supabase Auth user + inserts into `users` and role-specific profile table

---

### 7.2 Login Flow
**Fields:**
| Field | Type |
|---|---|
| Email | Email input |
| Password | Password input |

**Additional Options:**
- "Forgot Password?" → triggers Supabase password reset email
- After login → checks user role → redirects to `/patient/dashboard` or `/caregiver/dashboard`
- Remember me toggle (localStorage session persistence)
- Biometric login for Android native (Capacitor Fingerprint plugin, Phase 2)

---

### 7.3 Onboarding Wizard (Post First Login)
Shown only on first login. Skippable.

- **Step 1:** Welcome screen with MemCall mascot / illustration
- **Step 2:** Tutorial on how to play games (animated, voice-narrated)
- **Step 3:** Set up first reminder (medicine or hydration)
- **Step 4:** Select preferred themes (cultural visuals — Assamese, Manipuri, Mizo, etc.)
- **Step 5:** Done — land on dashboard

---

## 8. Patient-Facing Feature Specifications

### 8.1 Patient Dashboard

**Layout:** Single-column, large elements, bottom navigation bar (4 tabs)

**Bottom Navigation Tabs:**
1. Home (Dashboard)
2. Play (Games)
3. Reminders
4. Profile

**Dashboard Sections:**

| Section | Description |
|---|---|
| Greeting Banner | "Good morning, Mohan!" with time-aware message + current date |
| Today's Streak | Days of consecutive app usage (motivational) |
| Quick Play | 2–3 suggested games (AI-selected based on performance) |
| Upcoming Reminders | Next 3 reminders (medicine / hydration / appointment) |
| Weekly Progress | Simple bar or ring showing game sessions this week |
| Motivational Message | Culturally relevant proverb or positive affirmation (regional language) |

**Accessibility Features:**
- Minimum font size: 20px body, 28px headings
- All elements tappable with minimum 48x48px touch targets
- Voice readout button on every screen (text-to-speech)
- High contrast mode toggle
- Screen reader (ARIA) fully supported

---

### 8.2 Cognitive Games Module

#### Game Lobby
- Visual grid of available games
- Each game card shows: icon, game name, difficulty badge, last played date
- Filter by category: Memory / Attention / Daily Recall / Pattern Recognition

#### Game Categories & Individual Games

**A. Memory Improvement Games**

| Game | Description |
|---|---|
| Memory Match | Classic card-flip matching game. Cards show culturally familiar images (local vegetables, birds, landmarks, festivals) |
| Name That Face | Show a photo (family, historical, cultural figure) → patient types or speaks the name |
| Story Recall | Short audio story (regional language) → 5 questions about it afterward |
| Yesterday's Journey | Patient records voice or selects images of what they did the day before |

**B. Attention & Concentration Games**

| Game | Description |
|---|---|
| Find the Odd One | Show a grid of similar objects; find the one that doesn't belong |
| Number Sequence | Display a number sequence; patient taps the missing number |
| Color Trail | Follow a color-coded path in the correct sequence |
| Listen & Tap | Audio plays a sequence of sounds → patient replicates by tapping |

**C. Daily Routine Recall**

| Game | Description |
|---|---|
| Morning Routine Puzzle | Arrange scrambled daily activities in the correct order |
| What Day Is It? | Calendar-based questions (what day is today, what month, what year) |
| My Week | Patient selects icons representing what they did each day of the week |

**D. Pattern & Object Recognition**

| Game | Description |
|---|---|
| Shape Sorter | Drag shapes into matching outlines |
| Spot the Difference | Two similar images; find 3 differences |
| Cultural Object ID | Name the object shown (culturally NER-specific items: dhol drum, mekhela chador, bamboo hat, etc.) |
| Nature Walk | Identify animals, plants, birds common to NER region |

**E. Emotional & Mental Engagement**

| Game | Description |
|---|---|
| How Am I Feeling? | Daily mood check-in (emoji + voice description); logged for caregiver |
| Music Moment | Play a cultural NER folk song clip → patient taps the emotion it evokes |
| Memory Lane | Guided reminiscence: patient describes a happy memory via voice; saved and shareable with caregiver |

---

#### Game Screen Structure

```
┌────────────────────────────────┐
│  [Back]   Game Name   [Help🔊]  │
│────────────────────────────────│
│                                │
│         GAME CONTENT AREA      │
│   (DOM-based or Canvas-based   │
│    depending on game type)     │
│                                │
│────────────────────────────────│
│  Score: ■■■□□   Time: 01:23   │
│────────────────────────────────│
│  [🔊 Read Aloud]  [Skip Game]  │
└────────────────────────────────┘
```

**Game Rendering Strategy by Type:**

| Game Type | Renderer | Reason |
|---|---|---|
| Memory Match, Name That Face, Story Recall, Mood Check | React + Framer Motion (DOM) | Simple enough — card flips and fades are smooth in DOM |
| Shape Sorter, Spot the Difference, Color Trail, Pattern games | **react-konva** (Canvas) | Requires pixel-level hit detection, drag-and-drop on shapes, and smooth frame rendering — DOM cannot achieve 60fps here |
| Number Sequence, Morning Routine Puzzle, What Day Is It? | React (DOM) | Text/button-based; no canvas needed |
| Listen & Tap | React + Web Audio API | Audio-driven; DOM tap responses are sufficient |

> **Why react-konva for canvas games:** React's virtual DOM re-renders cause visible lag (jank) when game state updates 30–60 times per second. react-konva renders to HTML5 Canvas directly, bypassing the DOM entirely, achieving native-smooth 60fps — which is critical for elderly users who immediately perceive and are confused by UI lag.

**Game Session Data Captured:**
- `game_id`, `patient_id`
- `start_time`, `end_time`, `duration_seconds`
- `score` (0–100 normalized)
- `difficulty_level` (1–5)
- `questions_attempted`, `questions_correct`
- `hints_used`
- `completed` (boolean)
- `mood_before` (from daily check-in)

---

### 8.3 AI Adaptation Engine

The engine runs server-side via Supabase Edge Functions.

**Difficulty Adjustment Logic (Phase 1 — Rule-Based):**

```
After each completed session:
  rolling_avg = average of last 5 session scores for this game type

  IF rolling_avg > 80% THEN difficulty += 1 (max 5)
  IF rolling_avg < 40% THEN difficulty -= 1 (min 1)
  ELSE difficulty = unchanged

  New session starts at updated difficulty level
```

**Cognitive Score Computation (Per Patient, Weekly):**
- Composite of: accuracy rate, response time trend, session frequency, difficulty reached
- Score: 0–100 (higher = better)
- Stored in `cognitive_scores` table
- Decline detection: if score drops >15 points week-over-week → alert sent to linked caregiver

**Game Recommendation Engine:**
- Weight games not played in >3 days higher
- Prioritize game categories where patient scores lowest (targeted cognitive exercise)
- Factor in time of day (simpler games in evening)

**Phase 2 (AI API Integration):**
- Replace rule-based with Claude/OpenAI call to analyze session JSON and return personalized difficulty + game suggestions
- Sentiment analysis on voice recordings (Memory Lane game)

---

### 8.4 Voice & Multilingual Interface

**Supported Languages:**
1. English
2. Hindi
3. Assamese (অসমীয়া)
4. Bengali (বাংলা)
5. Manipuri / Meitei (মেইতেই)
6. Mizo
7. Nagamese
8. Bodo (बड़ो)

**Voice Features:**
| Feature | Description |
|---|---|
| Read Aloud | Every screen has a "🔊" button; tapping reads all visible text via TTS |
| Voice Commands | Patient can say "Play Memory Match", "Set medicine reminder", "Go home" |
| Voice Answers | Games accept spoken answers (Web Speech API recognition) |
| Voice Reminders | Reminder notifications include audio readout of the reminder text |
| Language Toggle | Accessible from every screen via globe icon in top nav |

**Implementation Notes:**
- Web Speech API used for browser/PWA
- Capacitor Speech Recognition plugin for Android native
- Fallback: if speech recognition unavailable, revert to touch-only mode with clear visual affordance
- All game instructions pre-recorded as audio clips (MP3, stored in Supabase Storage) to support offline mode

---

### 8.5 Reminder & Alert System

**Reminder Types:**
| Type | Icon | Description |
|---|---|---|
| Medicine | 💊 | Drug name, dosage, time |
| Hydration | 💧 | "Time to drink water!" |
| Daily Activity | 🚶 | Morning walk, prayer, meals |
| Medical Appointment | 🏥 | Doctor name, location, date/time |
| Game Session | 🎮 | "Let's play your daily brain exercise!" |

**Reminder Configuration:**
| Field | Type |
|---|---|
| Title | Text (or voice input) |
| Type | Dropdown (above types) |
| Time | Time picker |
| Frequency | Once / Daily / Weekly / Custom days |
| Notes | Optional text / voice note |
| Active | Toggle |

**Notification Delivery:**
- Web: Browser push notifications (Service Worker)
- Android: Capacitor Local Notifications plugin
- Notification payload includes title + audio TTS readout option
- Missed reminders are logged and surfaced to caregiver dashboard

**Reminder Acknowledgment:**
- Patient taps "Done ✅" or "Remind me in 15 min ⏰"
- Acknowledgment logged with timestamp in `reminder_logs` table

---

### 8.6 Offline Mode & Sync

**Offline-First Architecture:**

| Data | Offline Behavior |
|---|---|
| Game content (JS/CSS) | Pre-loaded at install / first launch via Service Worker (`CacheFirst` strategy) |
| Game audio clips (MP3) | Pre-cached via Workbox `CacheFirst` — must be explicitly listed in Workbox manifest |
| Game images & assets | Pre-cached via Workbox `CacheFirst` |
| Supabase API calls | `NetworkFirst` strategy — tries network, falls back to cached response |
| Game sessions | Stored in IndexedDB (Dexie.js); synced to Supabase when connectivity returns |
| Reminders | Stored locally; Capacitor Local Notifications fire independently of network |
| Profile | Cached; read-only in offline mode |
| New accounts | Cannot register offline; shown friendly message |

**Workbox Caching Strategy Configuration (vite.config.ts):**
```typescript
// vite-plugin-pwa Workbox configuration
VitePWA({
  strategies: 'generateSW',
  workbox: {
    // Pre-cache all game assets at install time
    globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,webp,woff2}'],
    runtimeCaching: [
      {
        // Game audio and images: cache first, serve from cache if offline
        urlPattern: /^https:\/\/.*supabase\.co\/storage\/.*/,
        handler: 'CacheFirst',
        options: { cacheName: 'game-assets', expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } }
      },
      {
        // Supabase API calls: try network, fall back to cache
        urlPattern: /^https:\/\/.*supabase\.co\/rest\/.*/,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 }
      }
    ]
  }
})
```

> **Why this matters:** Without explicit Workbox strategy configuration, `vite-plugin-pwa` only caches the app shell (HTML/JS/CSS). Game audio files and images stored in Supabase Storage would NOT be cached, meaning games would fail in offline mode — breaking a core platform requirement for NER rural users.

**Sync Strategy:**
- Background sync on app open (if network available)
- Conflict resolution: last-write-wins for profile; append-only for sessions/logs
- Sync status indicator in app header (✅ Synced / 🔄 Syncing / ⚠ Offline)
- Offline queue stored in Dexie.js `sync_queue` table; processed sequentially on reconnect

**Capacitor Network Plugin:**
- `@capacitor/network` listens for connectivity changes
- On reconnect → trigger sync queue flush via TanStack Query `invalidateQueries`

---

### 8.7 Profile & Settings

**Profile Section:**
- Avatar (initials-based if no photo)
- Full name (editable)
- Email (view only)
- DOB (view only)
- Gender (view only)
- Preferred language (editable)
- Linked caregiver name (view only; caregiver links via their flow)

**Settings:**
| Setting | Description |
|---|---|
| Language | Change app language |
| Font Size | Small / Medium / Large / Extra Large |
| High Contrast Mode | Toggle |
| Notification Sound | On/Off |
| Voice Interaction | Enable/Disable |
| Theme | Cultural theme (Assamese / Mizo / Manipuri / etc.) |
| Dark Mode | Toggle (overrides default black/white scheme) |
| Logout | With confirmation |
| Delete Account | With confirmation + email verification |

---

## 9. Caregiver-Facing Feature Specifications

### 9.1 Caregiver Dashboard

**Layout:** Standard web-style dashboard with sidebar (desktop) / bottom nav (mobile)

**Dashboard Sections:**
| Section | Description |
|---|---|
| My Patients | Cards for each linked patient showing last active time + status |
| Alerts Panel | Red/amber alerts for missed reminders, cognitive score drops |
| Quick Actions | "Add Reminder", "View Report", "Message Patient" |
| Recent Activity | Timeline of last 7 days' patient sessions |

---

### 9.2 Patient Detail View

Accessible per-patient. Sections:

**A. Cognitive Progress:**
- Weekly cognitive score chart (line graph — last 8 weeks)
- Game-by-game performance breakdown
- Difficulty level progression per game type
- Trend indicator (improving / stable / declining) with color badge

**B. Reminder Compliance:**
- Today's reminders: acknowledged vs. missed (donut chart)
- 7-day compliance calendar (green = compliant, red = missed)
- Upcoming appointments list

**C. Activity Log:**
- Session-by-session log table: game name, duration, score, date
- Filter by date range and game type
- Export as CSV or PDF

**D. Mood Log:**
- Daily mood entries from "How Am I Feeling?" game
- Calendar heatmap of mood (calm / happy / anxious / sad / confused)

**E. Memory Lane:**
- Patient-recorded voice memories
- Playable audio cards with transcript

---

### 9.3 Caregiver Alert System

| Alert Trigger | Notification Type |
|---|---|
| Cognitive score drops >15 pts | Push + in-app red badge |
| Patient misses 3+ consecutive reminders | Push + amber badge |
| Patient has not opened app in 3+ days | Daily digest email |
| Patient marks mood as "anxious" or "sad" 3 days in a row | Immediate push notification |
| Medical appointment within 24 hours | Push + email |

Alerts are delivered via Supabase Realtime to web, and Firebase Cloud Messaging (FCM) via Capacitor Push Notifications plugin to Android.

---

## 10. Admin Panel Specifications

> **Design Principle:** Admin panel UI is intentionally minimal, functional, and text-focused. No decorative elements, illustrations, or complex visualizations. Built using **shadcn/ui** components (Table, Dialog, Badge, Select, Input, Button) with Tailwind utility classes. shadcn/ui is used here — and only here — because its unstyled-by-default primitives produce exactly the clean, accessible, functional layout required for admin work, without imposing any visual richness. Black/white color scheme with standard table layouts throughout.

---

### 10.1 First-Time Admin Setup

**Route:** `/admin/setup`  
**Condition:** Only accessible when `admin_config.is_setup_complete = false` in DB (i.e., no admin account exists yet).  
**After completion:** Route returns 403/redirect permanently.

**Setup Form Fields:**
| Field | Type | Rule |
|---|---|---|
| Admin Full Name | Text | Required |
| Admin Email | Email | Required; stored as plain text in `admin_config` |
| Admin Password | Password | Min 12 characters; stored as bcrypt hash |
| Confirm Password | Password | Must match |

**On Submit:**
1. Validate fields
2. Hash password with bcrypt
3. Insert single row into `admin_config` with `is_setup_complete = true`
4. Redirect to `/admin/login`
5. `/admin/setup` route is disabled for all future requests

**Note:** Admin credentials are **fixed after creation**. There is no "change password" feature in the admin panel. To reset, a developer must directly update the DB record.

---

### 10.2 Admin Login

**Route:** `/admin/login`  
**Auth:** Custom authentication (NOT Supabase Auth). On submit:
1. Fetch `admin_config` row (single row expected)
2. Compare submitted email + bcrypt hash of submitted password
3. On match → generate signed JWT stored in `sessionStorage` (not localStorage for security)
4. Redirect to `/admin/dashboard`

---

### 10.3 Admin Dashboard (Analytics Overview)

**Layout:** Plain 2-column grid of stat cards + simple tables. No chart libraries unless data demands it.

**Stat Cards (Top Row):**
| Metric | Display |
|---|---|
| Total Registered Users | Count |
| Total Patients | Count |
| Total Caregivers | Count |
| Active Today (DAU) | Count |
| Game Sessions (This Week) | Count |
| Reminders Set (Total) | Count |
| Reminder Compliance Rate | Percentage |
| Average Cognitive Score | Number (0–100) |

**Analytics Section:**

| Sub-section | Description |
|---|---|
| User Growth Table | Month-by-month new registrations (table, no chart required) |
| Game Usage Table | Sessions per game type this month |
| Language Distribution | Breakdown of users per language preference |
| Regional Distribution | Users by state (if location data collected) |
| Alert Volume | Number of caregiver alerts sent this week |
| Cognitive Trend | Count of patients: improving / stable / declining |

---

### 10.4 User Management

**Route:** `/admin/users`

**View:** Searchable, sortable, paginated table (50 rows per page)

**Table Columns:**
| Column | Description |
|---|---|
| # | Row number |
| Full Name | Text |
| Email | Text |
| Role | Patient / Caregiver badge |
| Language | Language preference |
| Registered On | Date |
| Last Active | Date |
| Status | Active / Suspended |
| Actions | View / Edit / Suspend / Delete |

**Search & Filter:**
- Search by name or email (text input)
- Filter by role, language, registration date range
- Filter by status (active / suspended)

---

### 10.5 Single User Detail (`/admin/users/:id`)

**Sections:**
1. **Basic Info** — all profile fields (editable inline)
2. **Account Status** — Active / Suspended toggle
3. **Linked Accounts** — Patient's linked caregivers or Caregiver's linked patients
4. **Activity Summary** — Last login, total sessions, total game time
5. **Danger Zone:**
   - **Suspend Account** — prevents login without data deletion
   - **Delete Account** — hard delete with confirmation dialog (type "DELETE" to confirm)
   - **Reset Reminders** — delete all reminders for user
   - **Export User Data** — download JSON of all user data (DPDP compliance)

---

### 10.6 Patient Management (`/admin/patients`)

- Separate patient-only filtered view
- Sortable by: cognitive score, last active, registration date
- Additional columns: Cognitive Score, Linked Caregiver
- Bulk actions: Export CSV, Bulk suspend

---

### 10.7 Caregiver Management (`/admin/caregivers`)

- Caregiver-only filtered view
- Columns: name, email, linked patients count, last login
- Actions: View linked patients, suspend, delete

---

### 10.8 Game Content Management (`/admin/games`)

| Action | Description |
|---|---|
| List games | Table with game name, category, cultural theme, active status |
| Toggle active | Enable/disable a game globally |
| Edit metadata | Game name, description, category, default difficulty |
| Upload assets | Images/audio for game (uploaded to Supabase Storage) |
| Add new game | Basic form to create a new game entry (custom game content upload) |

---

### 10.9 System Settings (`/admin/settings`)

| Setting | Description |
|---|---|
| App Name / Version | Read-only display |
| Maintenance Mode | Toggle — shows maintenance screen to all non-admin users |
| Default Language | Global fallback language |
| Cognitive Score Alert Threshold | Number field (default: 15-point drop) |
| Inactivity Alert Days | Days before "user inactive" alert fires (default: 3) |
| Contact / Support Email | Shown in app footer |

---

## 11. Database Schema (Supabase)

### 11.1 Table: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  dob DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver')),
  language_preference TEXT DEFAULT 'en',
  cultural_theme TEXT DEFAULT 'assamese',
  font_size TEXT DEFAULT 'large',
  high_contrast BOOLEAN DEFAULT false,
  voice_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_suspended BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.2 Table: `patient_profiles`
```sql
CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  cognitive_concern_level TEXT CHECK (level IN ('mild', 'moderate', 'severe')),
  current_cognitive_score NUMERIC(5,2) DEFAULT 50,
  streak_days INTEGER DEFAULT 0,
  last_mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.3 Table: `caregiver_profiles`
```sql
CREATE TABLE caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  relationship_type TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.4 Table: `caregiver_patient_links`
```sql
CREATE TABLE caregiver_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'active', 'revoked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(caregiver_id, patient_id)
);
```

### 11.5 Table: `games`
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('memory', 'attention', 'recall', 'pattern', 'emotional')),
  description TEXT,
  cultural_theme TEXT,
  default_difficulty INTEGER DEFAULT 2 CHECK (default_difficulty BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  audio_instruction_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.6 Table: `game_sessions`
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id),
  difficulty_level INTEGER,
  score NUMERIC(5,2),
  questions_attempted INTEGER,
  questions_correct INTEGER,
  hints_used INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  mood_before TEXT,
  played_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.7 Table: `cognitive_scores`
```sql
CREATE TABLE cognitive_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  composite_score NUMERIC(5,2),
  accuracy_rate NUMERIC(5,2),
  avg_response_time_ms INTEGER,
  sessions_count INTEGER,
  avg_difficulty NUMERIC(3,1),
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, week_start_date)
);
```

### 11.8 Table: `reminders`
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('medicine', 'hydration', 'activity', 'appointment', 'game')),
  title TEXT NOT NULL,
  notes TEXT,
  time TIME NOT NULL,
  frequency TEXT CHECK (frequency IN ('once', 'daily', 'weekly', 'custom')),
  custom_days TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.9 Table: `reminder_logs`
```sql
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES users(id),
  triggered_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  snoozed BOOLEAN DEFAULT false,
  snooze_minutes INTEGER
);
```

### 11.10 Table: `mood_logs`
```sql
CREATE TABLE mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mood TEXT CHECK (mood IN ('happy', 'calm', 'anxious', 'sad', 'confused', 'neutral')),
  voice_note_url TEXT,
  transcript TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.11 Table: `memory_lane_entries`
```sql
CREATE TABLE memory_lane_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  audio_url TEXT,
  transcript TEXT,
  shared_with_caregiver BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.12 Table: `alerts`
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('cognitive_drop', 'reminder_missed', 'inactivity', 'mood_concern', 'appointment')),
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.13 Table: `admin_config`
```sql
CREATE TABLE admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  admin_password_hash TEXT NOT NULL,
  is_setup_complete BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,
  default_language TEXT DEFAULT 'en',
  cognitive_alert_threshold INTEGER DEFAULT 15,
  inactivity_alert_days INTEGER DEFAULT 3,
  support_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
```

### 11.14 Row-Level Security (RLS) Policies
- `users`: user can read/update own row; admin has full access
- `patient_profiles`: patient reads own; linked caregiver reads; admin full
- `game_sessions`: patient inserts/reads own; caregiver reads linked patient's; admin reads all
- `reminders`: patient + linked caregiver CRUD; admin full
- `admin_config`: accessible only from Edge Functions with service role key

---

## 12. API & Integration Architecture

### 12.1 Supabase Edge Functions

| Function | Trigger | Description |
|---|---|---|
| `compute-cognitive-score` | Cron (weekly Sunday midnight) | Aggregates game sessions → writes to `cognitive_scores`; detects trends |
| `send-caregiver-alert` | DB trigger on `cognitive_scores` insert | If trend = 'declining', inserts into `alerts` + sends push |
| `sync-offline-sessions` | HTTP POST from client | Accepts batch of offline game_sessions → inserts to DB |
| `reminder-checker` | Cron (every minute) | Checks `reminders` for due items → triggers push notifications |
| `admin-auth` | HTTP POST `/admin/login` | Validates admin credentials, returns signed JWT |

### 12.2 Supabase Realtime Subscriptions

| Channel | Subscriber | Event |
|---|---|---|
| `alerts:caregiver_id=X` | Caregiver app | New alert inserted for their patients |
| `reminders:patient_id=X` | Patient app | Reminder updated/added by caregiver |

### 12.3 External Integrations

| Service | Purpose | Phase |
|---|---|---|
| Web Speech API | Browser voice recognition | Phase 1 |
| Capacitor Speech | Android voice recognition | Phase 1 |
| Claude API | Advanced AI adaptation + sentiment | Phase 2 |
| FCM (Firebase) | Android push notifications | Phase 1 |

---

## 13. Design System & UI/UX Guidelines

### 13.1 Color Palette

**User-Facing Application:**
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#000000` | Buttons, headings, key UI elements |
| `--color-secondary` | `#FFFFFF` | Backgrounds, card surfaces |
| `--color-accent` | `#1A1A1A` | Subtle contrast elements |
| `--color-surface` | `#F5F5F5` | Page background |
| `--color-border` | `#E0E0E0` | Input borders, dividers |
| `--color-success` | `#2D8C45` | Correct answer, completed reminder |
| `--color-warning` | `#B45309` | Missed reminder, declining score |
| `--color-danger` | `#C0392B` | Critical alert, delete action |
| `--color-muted` | `#6B7280` | Secondary text |

**Admin Panel:**
| Token | Value |
|---|---|
| Background | `#FAFAFA` |
| Table borders | `#D1D5DB` |
| Text | `#111827` |
| Action buttons | `#000000` (black) |
| Danger | `#DC2626` |

### 13.2 Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| H1 Heading | System sans-serif | 32px | 700 |
| H2 Heading | System sans-serif | 26px | 700 |
| Body (Normal) | System sans-serif | 20px | 400 |
| Body (Large mode) | System sans-serif | 24px | 400 |
| Button text | System sans-serif | 20px | 600 |
| Caption / Label | System sans-serif | 16px | 400 |

> **Note:** Elderly users default to "Large" font size. "Extra Large" increases all sizes by 25%.

### 13.3 Component Library (Custom, Tailwind-based)

| Component | Description |
|---|---|
| `BigButton` | Full-width, 56px tall, high-contrast black/white |
| `GameCard` | Visual card with large icon, title, difficulty dots |
| `ReminderItem` | Row with type icon, title, time, and status toggle |
| `AlertBadge` | Colored badge: red/amber/green |
| `ScoreRing` | SVG ring showing weekly score (0–100) |
| `MoodPicker` | 6 large emoji buttons with labels |
| `VoiceButton` | Floating action button: 🔊, always visible |
| `ProgressBar` | Step indicator for multi-step forms |

### 13.4 UX Principles for Elderly Users

1. **No hidden gestures** — every action has a visible, labeled button
2. **Confirmation dialogs** — all destructive or significant actions require confirmation
3. **Auto-save** — form inputs saved to localStorage as typed
4. **Error messages in plain language** — "Oops! The email you entered is already used. Please try a different one."
5. **No time pressure** — games have generous or configurable time limits
6. **Undo support** — where possible, allow undoing last action
7. **Consistent placement** — navigation elements never move between screens
8. **Loading states** — always show a spinner or skeleton; never blank screen

---

## 14. Android (Capacitor) Specifics

### 14.1 Capacitor Configuration (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memcall.app',
  appName: 'MemCall',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#FFFFFF',
    // CRITICAL: Do NOT use fullscreen.
    // Status bar and navigation buttons must remain visible.
  },
  plugins: {
    StatusBar: {
      style: 'Default',         // Black text on light background
      backgroundColor: '#FFFFFF',
      overlaysWebView: false     // Status bar does NOT overlay content
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_memcall',
      iconColor: '#000000'
    }
  }
};

export default config;
```

### 14.2 Android Manifest Notes (`AndroidManifest.xml`)

```xml
<!-- IMPORTANT: Do NOT set android:theme with windowFullscreen or windowLayoutNoLimits -->
<!-- Use the default theme with status bar visible -->
<activity
  android:name=".MainActivity"
  android:exported="true"
  android:theme="@style/AppTheme.NoActionBar"
  android:windowSoftInputMode="adjustResize">
```

```xml
<!-- styles.xml: No fullscreen flags -->
<style name="AppTheme.NoActionBar">
  <item name="windowActionBar">false</item>
  <item name="windowNoTitle">true</item>
  <!-- Do NOT add: android:windowFullscreen = true -->
</style>
```

### 14.3 Required Capacitor Plugins

```json
{
  "@capacitor/status-bar": "^6.0.0",
  "@capacitor/splash-screen": "^6.0.0",
  "@capacitor/local-notifications": "^6.0.0",
  "@capacitor/network": "^6.0.0",
  "@capacitor/speech-recognition": "^6.0.0",
  "@capacitor-community/text-to-speech": "^4.0.0",
  "@capacitor/push-notifications": "^6.0.0"
}
```

### 14.4 Responsive Layout Strategy

- CSS uses `env(safe-area-inset-top/bottom)` to respect Android safe areas
- Bottom navigation bar: uses `padding-bottom: env(safe-area-inset-bottom)` so content doesn't collide with Android gesture nav bar
- Viewport meta tag:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ```
- Tailwind `pb-safe` utility applied to bottom-nav container

### 14.5 Offline Data Flow (Android)

```
App opens → Check Capacitor Network Status
  → ONLINE:  Sync IndexedDB queue to Supabase → load fresh data
  → OFFLINE: Load from IndexedDB → show "Offline Mode" indicator
               Game sessions saved to IndexedDB
               Reminders fire from Capacitor Local Notifications (no network needed)
App regains network → Trigger background sync
```

---

## 15. Complete Dependency List (package.json)

### 15.1 Production Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",

    "@tanstack/react-query": "^5.56.0",
    "zustand": "^4.5.0",

    "@supabase/supabase-js": "^2.45.0",

    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",

    "framer-motion": "^11.5.0",
    "react-konva": "^18.2.10",
    "konva": "^9.3.0",

    "dexie": "^4.0.8",
    "dexie-react-hooks": "^1.1.7",

    "@capacitor/core": "^6.0.0",
    "@capacitor/android": "^6.0.0",
    "@capacitor/status-bar": "^6.0.0",
    "@capacitor/splash-screen": "^6.0.0",
    "@capacitor/local-notifications": "^6.0.0",
    "@capacitor/network": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/speech-recognition": "^6.0.0",
    "@capacitor-community/text-to-speech": "^4.0.0",

    "tailwind-merge": "^2.5.0",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0",

    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",

    "lucide-react": "^0.438.0",

    "date-fns": "^3.6.0"
  }
}
```

### 15.2 Development Dependencies

```json
{
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite-plugin-pwa": "^0.20.0",
    "workbox-window": "^7.1.0",

    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",

    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",

    "@capacitor/cli": "^6.0.0",

    "eslint": "^9.9.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "prettier": "^3.3.0"
  }
}
```

> **shadcn/ui note:** shadcn/ui components are not installed as an npm package — they are copied directly into `/src/components/ui/` via the shadcn CLI (`npx shadcn@latest add table button dialog badge input select`). This keeps the bundle lean: only the components actually used are included.

---

## 16. Deployment Strategy

### 16.1 Web (Vercel)

```
Repository: GitHub (main branch)
Build Command: npm run build
Output Directory: dist
Environment Variables (Vercel dashboard):
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
  VITE_APP_ENV=production
Preview Deployments: Auto on every PR (feature branch → Vercel preview URL)
Production: Auto on merge to main
```

### 16.2 Android APK (GitHub Actions)

```yaml
# .github/workflows/android-build.yml
name: Android Build
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js + npm install
      - npm run build (Vite)
      - npx cap sync android
      - Setup Java 17
      - Gradle assembleRelease
      - Sign APK with keystore (GitHub Secrets)
      - Upload signed APK as release artifact
```

### 16.3 Supabase Configuration

- Project created on Supabase cloud
- RLS enabled on all tables
- Migrations managed via Supabase CLI + `/supabase/migrations` folder in repo
- Edge Functions deployed via `supabase functions deploy`
- Cron jobs configured in Supabase dashboard

### 16.4 Environment Setup Summary

```
Development:  localhost:5173 (Vite dev server) + Supabase local
Staging:      vercel preview URL + Supabase staging project
Production:   memcall.vercel.app (or custom domain) + Supabase production project
Android:      Signed APK from GitHub Actions
```

---

## 17. Security & Privacy Requirements

| Requirement | Implementation |
|---|---|
| Auth | Supabase Auth (JWT, bcrypt) |
| HTTPS only | Enforced by Vercel + Supabase |
| RLS | All DB tables protected; users only access own data |
| Admin credentials | bcrypt-hashed password; JWT session only in sessionStorage |
| Sensitive data | No plain-text passwords; no health data in localStorage |
| DPDP Compliance | User data export + delete functionality in admin panel |
| Audit log | All admin actions logged to `admin_audit_log` table |
| Input sanitization | Zod schema validation on all forms; server-side validation in Edge Functions |
| Voice recordings | Stored in private Supabase Storage bucket; URL signed (expires in 1 hour) |
| No third-party trackers | No Google Analytics, no ad SDKs |

---

## 18. Non-Functional Requirements

### 18.1 Performance Targets

| Requirement | Target | Implementation Note |
|---|---|---|
| Page load time (web) | < 2.5 seconds on 4G | Route-level code splitting via React.lazy(); Vite build chunking |
| Game load time | < 1 second after lobby selection | Game module lazy-loaded on lobby hover (preload hint) |
| Game frame rate (canvas games) | Consistent 60fps | react-konva canvas renderer; no DOM game logic |
| Game response latency (touch to action) | < 100ms | No heavy JS in tap handlers; use CSS for visual feedback first |
| Supabase data fetch (dashboard) | < 800ms | TanStack Query cache serves instantly on revisit; background revalidation |
| Offline game playability | 100% of game types | Workbox CacheFirst for all game assets; Dexie.js for session storage |
| Android APK size | < 50 MB | Code splitting per game module; audio assets fetched on demand post-install |
| Browser support | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ | — |
| Android version | 8.0+ (API 26+) | — |
| Screen sizes | 320px to 1440px (fully responsive) | — |
| Uptime SLA | 99.5% (Supabase cloud + Vercel) | — |
| Accessibility | WCAG 2.1 AA compliance | shadcn/ui (admin) is WCAG-compliant; patient UI audited manually |

### 18.2 Elderly-Specific Performance Requirements

These requirements are specific to the elderly patient user group and must be treated as first-class non-functional requirements, not nice-to-haves:

| Requirement | Target | Why It Matters for Elderly Users |
|---|---|---|
| Touch-to-visual feedback | < 50ms | Elderly users tap and immediately look for feedback; any delay causes them to tap again, causing double actions |
| Layout stability (CLS score) | 0 (zero layout shift) | Content jumping after load causes confusion and disorientation in dementia patients |
| Font rendering | No invisible text flash (FOIT) | Use `font-display: swap`; prefer system fonts — flash of invisible text is alarming for elderly users |
| Animation — reduce motion | All animations skippable | Patients with vestibular disorders or motion sensitivity must be able to disable all animations from Settings |
| No auto-dismissing toasts | Minimum 8 seconds visible | Elderly users read slowly; 3-second toasts are missed entirely |
| No hover-only interactions | Zero | All desktop hover states must have tap equivalents; elderly users may use touchscreen desktops |
| Error messages | Plain language, no error codes | Never show "Error 400" or "undefined is not a function" — always show a human-written fallback message |
| Session timeout | Minimum 30 minutes idle | Standard 15-minute JWT expiry is too short; elderly users take long breaks mid-session |
| Loading skeletons | On every async component | Never show a blank white screen — use skeleton placeholders that match the expected content shape |

### 18.3 Code Quality Requirements

| Requirement | Standard |
|---|---|
| TypeScript | Strict mode (`strict: true` in tsconfig); no `any` types |
| Component structure | Atomic design: atoms → molecules → organisms → pages |
| TanStack Query | All Supabase calls through custom `useQuery`/`useMutation` hooks; no raw fetch in components |
| Game modules | Each game is a self-contained module in `/src/games/<game-slug>/`; loaded via React.lazy() |
| Zustand stores | Separate stores per concern: `useUIStore`, `useAuthStore`, `useSettingsStore` |
| Error boundaries | React `ErrorBoundary` wrapping every game module and every major page section |

---

## 19. Future Enhancements (Phase 2+)

| Feature | Description |
|---|---|
| Biometric login | Fingerprint / Face ID via Capacitor |
| AI-powered game personalization | Claude API integration for dynamic content generation |
| Telemedicine integration | Video call slot booking with geriatric specialists |
| iOS support | Capacitor iOS build + App Store deployment |
| Family video messages | Caregiver records short video; patient receives as notification |
| WhatsApp reminder fallback | For patients without smartphone, send reminders via WhatsApp Business API |
| Smart wearable integration | Heart rate / activity data from Fitbit / Galaxy Watch |
| Doctor report export | PDF cognitive report generation for clinical handover |
| Community forum | Moderated caregiver peer support forum |
| Offline language model | On-device TTS for fully offline voice interaction |

---

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | August 2026 | Initial PRD — full feature specification |
| 1.1 | August 2026 | Tech stack refinements: Added TanStack Query (server state), Zustand scoped to UI state only; Added shadcn/ui for admin panel; Added react-konva for canvas game rendering; Added React.lazy() code splitting strategy; Replaced bare vite-plugin-pwa with configured Workbox strategy; Added Section 3.6 (Framework Decision Rationale); Added Section 15 (Complete Dependency List); Expanded Section 18 with elderly performance requirements and code quality standards |

---

*End of MemCall PRD v1.1*

---
**Document prepared for:** MemCall Development Team  
**Platform:** React + Vite + TanStack Query + Zustand + react-konva + Capacitor + Supabase + Vercel  
**Application:** AI-Based Cognitive Gaming and Memory Assistance Platform — NER, India