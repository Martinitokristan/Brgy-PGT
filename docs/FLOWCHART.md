# BarangayPGT — System Flowcharts

## Resident Flow

```mermaid
flowchart TD
    A[Landing Page] --> B{Has Account?}
    B -- No --> C[Register Page]
    C --> C1[Fill in Personal Info]
    C1 --> C2[Upload Valid ID]
    C2 --> C3[Submit Registration]
    C3 --> C4[Pending Registration Created in DB]
    C4 --> C5[Verification Email Sent - 15 min expiry]
    C5 --> D[Verify Email Page]
    D --> D1{Clicked Email Link?}
    D1 -- No --> D2[Resend Verification Email]
    D2 --> D1
    D1 -- Yes --> D3[Email Verified in DB]
    D3 --> E[Approval Pending Page]
    E --> E1[Wait for Admin Approval]
    E1 --> E2[Admin Approves: Auth User + Profile Created]
    E2 --> E3[SMS Notification Sent to Resident]

    B -- Yes --> F[Login Modal]
    F --> F1{Account Status?}
    F1 -- Email Not Verified --> D
    F1 -- Pending Approval --> E
    F1 -- New Device --> G[Device Verification Page]
    G --> G1[Enter OTP from Email]
    G1 --> G2[Device Trusted]
    G2 --> H
    F1 -- Approved + Trusted Device --> H[Feed Page]

    H --> I[Post Complaint / Concern]
    I --> I1[Choose Purpose: Complaint / Problem / Emergency / Suggestion / General]
    I1 --> I2[Set Urgency: Low / Medium / High]
    I2 --> I3[Add Title, Description, Image]
    I3 --> I4[Post Published to Barangay Feed]

    H --> J[Browse Feed]
    J --> J1[React to Posts: Like / Heart / Support / Sad]
    J --> J2[Comment on Posts]
    J --> J3[Reply to Comments]
    J --> J4[Like Comments]

    H --> K[View Events]
    H --> L[Search Residents]
    L --> L1[View Profiles]
    L --> L2[Follow / Unfollow Residents]
    H --> M[Notifications]
    H --> N[Profile Settings]
    N --> N1[Edit Avatar / Cover Photo]
    N --> N2[Change Password]
    N --> N3[Manage Trusted Devices]
    N --> N4[Delete Account]
```

---

## Admin Flow

```mermaid
flowchart TD
    A[Landing Page] --> B[Login Modal]
    B --> C{Is Admin?}
    C -- Yes --> D[Admin Dashboard]

    D --> E[User Management]
    E --> E1[View All Users + Pending Registrations]
    E1 --> E2{User Type?}
    E2 -- Pending Registration --> E3[View Valid ID]
    E3 --> E4{Decision?}
    E4 -- Approve --> E5[Create Auth User + Profile]
    E5 --> E6[Trust Device from Registration]
    E6 --> E7[Send SMS Approval Notification]
    E7 --> E8[Delete Pending Registration Row]
    E4 -- Reject --> E9[Delete Pending Registration]
    E2 -- Existing User --> E10[Change Role: Resident / Admin]
    E2 -- Existing User --> E11[Revoke / Restore Access]

    D --> F[Feed Management]
    F --> F1[View All Posts in Barangay]
    F --> F2[Respond to Complaints]
    F2 --> F3[Set Post Status: Pending / In Progress / Resolved]
    F2 --> F4[Add Admin Response]

    D --> G[Events Management]
    G --> G1[Create New Event]
    G --> G2[Edit / Delete Events]

    D --> H[SMS Management]
    H --> H1[Send SMS to Residents]
    H --> H2[View SMS Logs]

    D --> I[Statistics Dashboard]
    I --> I1[Total Users / Posts / Events]
    I --> I2[Pending Approvals Count]

    D --> J[Notifications]
```

---

## Registration and Verification Flow (Detailed)

```mermaid
sequenceDiagram
    participant R as Resident
    participant FE as Frontend
    participant API as Register API
    participant DB as Supabase DB
    participant EM as Brevo Email
    participant AD as Admin

    R->>FE: Fill registration form + upload ID
    FE->>API: POST /api/auth/register (FormData)
    API->>API: Check duplicate email/phone
    API->>DB: Upload valid ID to storage
    API->>DB: INSERT into pending_registrations (email_verified=false)
    API->>EM: Send verification email (15 min link)
    EM-->>R: Verification email received

    R->>FE: Click verification link
    FE->>API: GET /api/auth/register/verify?token=xxx&email=xxx
    API->>DB: Validate token + check expiry
    API->>DB: UPDATE pending_registrations SET email_verified=true
    API-->>FE: Redirect to /verify-success

    Note over R,FE: If link expired, login redirects to /verify-email page
    R->>FE: Resend Verification
    FE->>API: POST /api/auth/register/resend
    API->>DB: Generate new token, update otp_code + otp_expires_at
    API->>EM: Send new verification email

    Note over AD: Admin reviews pending registrations
    AD->>API: PATCH /api/admin/users {id: pending_xxx, is_approved: true}
    API->>DB: Create Supabase Auth user
    API->>DB: Create profile (is_approved=true)
    API->>DB: Trust registration device
    API->>DB: Delete pending_registrations row
    API->>EM: Send SMS approval notification
```

---

## Login and Authentication Flow (Detailed)

```mermaid
sequenceDiagram
    participant R as User
    participant FE as Frontend
    participant API as Login API
    participant DB as Supabase

    R->>FE: Enter email + password
    FE->>API: POST /api/auth/login

    API->>DB: Check pending_registrations for email

    alt Has pending registration
        alt Email NOT verified
            API-->>FE: 200 {needs_verification, redirect_to: /verify-email}
            FE-->>R: Redirect to Verify Email page
        else Email verified, pending approval
            API-->>FE: 200 {pending_approval: true}
            FE-->>R: Redirect to Approval Pending page
        end
    else No pending registration (approved user)
        API->>DB: supabase.auth.signInWithPassword()
        alt Invalid credentials
            API-->>FE: 401 error
        else Valid credentials
            API->>DB: Check profile.is_approved
            alt Not approved
                API-->>FE: Profile with is_approved=false
                FE-->>R: Redirect to Pending Approval
            else Approved
                API->>DB: Check trusted_devices for device_token
                alt Device NOT trusted
                    API->>DB: Create device OTP
                    API-->>FE: {pending_device_verification: true}
                    FE-->>R: Redirect to Device Verification
                else Device trusted
                    API-->>FE: {profile, device_trusted: true}
                    alt Admin role
                        FE-->>R: Redirect to /admin/dashboard
                    else Resident role
                        FE-->>R: Redirect to /feed
                    end
                end
            end
        end
    end
```

---

## Post and Complaint Flow

```mermaid
flowchart TD
    A[Resident: Create Post] --> B[Select Purpose]
    B --> B1[Complaint]
    B --> B2[Problem]
    B --> B3[Emergency]
    B --> B4[Suggestion]
    B --> B5[General]

    B1 & B2 & B3 & B4 & B5 --> C[Set Urgency Level]
    C --> C1[Low]
    C --> C2[Medium]
    C --> C3[High]

    C1 & C2 & C3 --> D[Add Title + Description + Optional Image]
    D --> E[POST /api/posts]
    E --> F[Post Created - Status: Pending]

    F --> G[Visible in Community Feed]
    G --> H[Other Residents Can:]
    H --> H1[React: Like / Heart / Support / Sad]
    H --> H2[Comment]
    H --> H3[Reply to Comments]

    F --> I[Admin Reviews Post]
    I --> J[Admin Can:]
    J --> J1[Set Status: In Progress]
    J --> J2[Set Status: Resolved]
    J --> J3[Add Admin Response]
```
