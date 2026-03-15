# BarangayPGT — Documentation

**BarangayPGT** is an Online Complaint & Community Social Network exclusively for verified residents of Barangay Pagatpatan, Cagayan de Oro City. Residents can file complaints, post concerns, and stay connected with their community — completely free.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Supabase Setup](#supabase-setup)
- [Deployment to Vercel](#deployment-to-vercel)
- [Migrating to a New Supabase Project](#migrating-to-a-new-supabase-project)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TailwindCSS 4 |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| Email | Brevo (Sendinblue) SMTP API |
| SMS | iProg API |
| Animations | Framer Motion |
| Icons | Lucide React |
| Data Fetching | SWR |
| Deployment | Vercel |

---

## Project Structure

```
Brgy-PGT/
├── app/
│   ├── page.tsx                     # Landing page (login modal)
│   ├── (auth)/                      # Auth pages (no session required)
│   │   ├── register/page.tsx        # Registration form
│   │   ├── verify-email/page.tsx    # Email verification + resend
│   │   ├── verify-success/page.tsx  # Verification success
│   │   ├── verify-device/page.tsx   # Device OTP verification
│   │   ├── approval-pending/page.tsx# Waiting for admin approval
│   │   ├── pending-approval/page.tsx# Post-login pending approval
│   │   ├── forgot-password/page.tsx # Password reset request
│   │   └── reset-password/page.tsx  # Password reset form
│   ├── (resident)/                  # Resident pages (session required)
│   │   ├── feed/page.tsx            # Community feed
│   │   ├── posts/create/page.tsx    # Create post/complaint
│   │   ├── posts/[id]/page.tsx      # Single post view
│   │   ├── events/page.tsx          # Barangay events
│   │   ├── notifications/page.tsx   # Notifications
│   │   ├── search/page.tsx          # Search residents
│   │   ├── profile/me/page.tsx      # My profile
│   │   ├── profile/[id]/page.tsx    # Other user's profile
│   │   ├── settings/page.tsx        # Account settings
│   │   ├── security/page.tsx        # Security (devices, password)
│   │   └── help/page.tsx            # Help page
│   ├── (admin)/admin/               # Admin pages
│   │   ├── dashboard/page.tsx       # Admin dashboard + stats
│   │   ├── users/page.tsx           # User management
│   │   ├── users/[id]/page.tsx      # User detail
│   │   ├── feed/page.tsx            # Admin feed management
│   │   ├── posts/page.tsx           # Posts management
│   │   ├── events/page.tsx          # Events management
│   │   ├── sms/page.tsx             # SMS management
│   │   ├── notifications/page.tsx   # Admin notifications
│   │   └── barangays/page.tsx       # Barangay management
│   ├── api/                         # API routes (see below)
│   ├── components/                  # Shared components
│   └── terms/page.tsx               # Terms of service
├── lib/
│   ├── supabaseClient.ts            # Browser Supabase client
│   ├── supabaseServer.ts            # Server Supabase client (cookies)
│   ├── supabaseService.ts           # Service role client (admin ops)
│   ├── brevoMailer.ts               # Email sending via Brevo
│   ├── smsSender.ts                 # SMS sending via iProg
│   └── rateLimit.ts                 # In-memory rate limiter
├── supabase/
│   └── schema.sql                   # Complete database schema + RLS policies
├── docs/
│   ├── README.md                    # This file
│   └── FLOWCHART.md                 # System flowcharts (Mermaid)
└── public/                          # Static assets
```

---

## Database Schema

12 tables in total. See `supabase/schema.sql` for the complete schema with RLS policies.

| # | Table | Purpose |
|---|---|---|
| 1 | barangays | Barangay list (currently just Brgy. Pagatpatan) |
| 2 | profiles | User profiles (1:1 with auth.users) — name, role, approval status, phone, address, avatar |
| 3 | posts | Complaints, concerns, suggestions — with purpose, urgency, status, admin response |
| 4 | comments | Comments on posts, supports threading (parent_id) and likes |
| 5 | reactions | Post reactions: like, heart, support, sad (one per user per post) |
| 6 | notifications | User notifications for new posts, comments, reactions, follows |
| 7 | events | Barangay events created by admins |
| 8 | followers | Follow/unfollow between residents with notification preferences |
| 9 | trusted_devices | Trusted devices per user (skip OTP on known devices) |
| 10 | sms_logs | Log of all SMS sent by the system |
| 11 | pending_registrations | Pre-approval registrations with email verification status |
| 12 | device_otps | Temporary OTP codes for new device verification |

### Storage Buckets

| Bucket | Purpose |
|---|---|
| avatars | User profile pictures |
| post-images | Images attached to posts |
| valid-ids | Valid IDs uploaded during registration |

---

## API Routes

### Authentication

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Register new resident (FormData with valid ID) |
| GET | /api/auth/register/status | Poll email verification status |
| GET | /api/auth/register/verify | Verify email via token link |
| POST | /api/auth/register/resend | Resend verification email (rate limited: 3/15min) |
| POST | /api/auth/login | Login (handles pending, unverified, device check) |
| POST | /api/auth/logout | Sign out current session |
| POST | /api/auth/logout-all | Sign out all sessions |
| POST | /api/auth/password/forgot | Send password reset email (rate limited: 3/15min) |
| POST | /api/auth/password/change | Change password (rate limited: 5/15min) |
| POST | /api/auth/device/verify | Verify device with OTP |
| POST | /api/auth/device/resend | Resend device OTP |
| POST | /api/auth/email/resend | Resend email verification |
| POST | /api/auth/delete-account | Delete user account |

### Posts & Comments

| Method | Route | Description |
|---|---|---|
| GET/POST | /api/posts | List posts / Create post |
| GET/PATCH/DELETE | /api/posts/[id] | Get / Update / Delete single post |
| GET/POST | /api/posts/[id]/comments | List / Add comments |
| POST | /api/posts/[id]/comments/[commentId]/like | Toggle comment like |
| GET/POST | /api/posts/[id]/reactions | Get / Toggle post reaction |
| DELETE | /api/posts/comments/[id] | Delete comment |

### Profiles & Social

| Method | Route | Description |
|---|---|---|
| GET/PATCH | /api/profile/me | Get / Update my profile |
| GET | /api/profile/[id] | View other user's profile |
| POST | /api/profile/[id]/follow | Follow / Unfollow user |
| GET | /api/users/search | Search users by name |

### Notifications

| Method | Route | Description |
|---|---|---|
| GET | /api/notifications | List notifications |
| PATCH | /api/notifications/[id]/read | Mark as read |
| GET | /api/notifications/unread-count | Get unread count |

### Events

| Method | Route | Description |
|---|---|---|
| GET | /api/events | List barangay events |

### Admin

| Method | Route | Description |
|---|---|---|
| GET/PATCH | /api/admin/users | List users + pending / Approve/Reject/Update |
| GET/POST | /api/admin/events | Admin event management |
| POST | /api/admin/sms | Send SMS to residents |
| GET | /api/admin/stats | Dashboard statistics |

---

## Environment Variables

Create a `.env.local` file in the project root with these variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_BARANGAY_ID=1

# Brevo (Email)
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=no-reply@yourdomain.com
BREVO_FROM_NAME=BarangayPGT

# iProg (SMS)
IPROG_API_TOKEN=your-iprog-api-token
IPROG_ENDPOINT=https://api.iprog.ph/sms/send
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- A Supabase project (free tier works)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/Brgy-PGT.git
cd Brgy-PGT

# 2. Install dependencies
npm install

# 3. Create .env.local and fill in your values (see Environment Variables above)

# 4. Set up Supabase (see Supabase Setup section below)

# 5. Run development server
npm run dev

# 6. Open http://localhost:3000
```

---

## Supabase Setup

### 1. Create a Supabase Project
- Go to [supabase.com](https://supabase.com) and create a new project
- Note your Project URL, anon key, and service role key from Settings > API

### 2. Run the Schema
- Go to SQL Editor in your Supabase dashboard
- Open `supabase/schema.sql` and paste the entire contents
- Click "Run" to create all tables, indexes, and RLS policies

### 3. Create Storage Buckets
In Supabase Dashboard > Storage, create these 3 buckets:

| Bucket Name | Public? |
|---|---|
| avatars | Yes |
| post-images | Yes |
| valid-ids | Yes |

### 4. Run the Seeder
- Open `supabase/seed.sql` and **edit the admin credentials** at the top of the DO block:
  - `admin_email` — your admin email
  - `admin_password` — your admin password
  - `admin_name` — display name
  - `admin_phone` — phone number
- Paste the entire file in the SQL Editor and click "Run"
- This will:
  1. Create the Barangay Pagatpatan row
  2. Create the admin directly in Supabase Auth (email pre-confirmed)
  3. Create the admin profile (approved, role=admin, no restrictions)
- The admin can log in immediately — no email verification, no device OTP, no approval needed

---

## Deployment to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project" > Import your GitHub repository
3. Framework Preset: **Next.js** (auto-detected)
4. Leave build settings as default

### 3. Configure Environment Variables
In Vercel Project > Settings > Environment Variables, add ALL variables from [Environment Variables](#environment-variables) section.

**Important:** Set `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g., `https://brgy-pgt.vercel.app`).

### 4. Deploy
Click "Deploy" and wait for the build to complete.

### 5. Post-Deploy Checklist
- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to match your actual URL
- [ ] In Supabase Dashboard > Auth > URL Configuration, set **Site URL** to your Vercel URL
- [ ] In Supabase Dashboard > Auth > URL Configuration, add your Vercel URL to **Redirect URLs**
- [ ] Test registration, email verification, login, and approval flows
- [ ] Create your first admin account

---

## Migrating to a New Supabase Project

If you need to switch to a new Supabase project (e.g., fresh start):

### Only 3 values change in .env.local:

| Variable | Where to Find |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | New project > Settings > API > Project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | New project > Settings > API > anon public |
| SUPABASE_SERVICE_ROLE_KEY | New project > Settings > API > service_role |

All other env vars (Brevo, iProg, etc.) stay the same.

### After updating .env.local:
1. Run `supabase/schema.sql` in the new project's SQL Editor
2. Create storage buckets (avatars, post-images, valid-ids)
3. Seed the barangay row
4. If deployed on Vercel, update the 3 env vars there too and redeploy

---

## Security Features

- **Email Verification** — 15-minute expiration links via Brevo
- **Device Trust** — OTP verification for new/unknown devices
- **Rate Limiting** — In-memory limits on sensitive endpoints:
  - Resend verification: 3 requests per email per 15 minutes
  - Forgot password: 3 requests per email per 15 minutes
  - Change password: 5 requests per user per 15 minutes
- **Admin Approval** — Every account requires admin review with valid ID
- **Row Level Security** — Supabase RLS policies enforce data access at the database level
- **Service Role Isolation** — Admin operations use service role client, never exposed to browser

---

## User Roles

| Role | Access |
|---|---|
| Resident | Feed, post complaints, comment, react, events, profile, follow, notifications |
| Admin | All resident features + user management, post moderation, events CRUD, SMS, dashboard stats |
