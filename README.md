# PHOTO PLANET STUDIO — QUOTATION MANAGEMENT SYSTEM (PWA)

A complete, production-ready, **offline-first Quotation Management PWA** built for **PHOTO PLANET STUDIO & Cinematography**. Designed to run on a local studio server machine with a shared SQLite database accessible simultaneously by desktop computers, laptops, iPads, tablets, and smartphones over local studio Wi-Fi without needing an active internet connection.

---

## 📸 Core Features

- **Offline-First Local Architecture**: Primary data resides in an atomic SQLite database on your local studio machine. Zero reliance on external cloud APIs or external CDNs.
- **Multi-Device Wi-Fi Connectivity**: Connect phones, tablets, and computers across the studio on `http://<STUDIO-IP>:3000`.
- **Installable PWA**: Real installable PWA (`manifest.json` + Service Worker). Tap *"Add to Home Screen"* on Chrome, Edge, or Safari to run standalone with native app feel.
- **Two Strict Access Levels**:
  - **ADMIN**: Complete access to dashboard analytics, master service pricing, custom event types, staff management, studio branding, terms & conditions, backup & restore, and audit logs.
  - **QUOTATION STAFF**: Fast quotation builder, client CRM, event scheduling, printing and PDF exports. Master pricing is protected on the backend (staff cannot modify master rates).
- **Multi-Event Quotations**: Group services under multiple event dates (e.g., Godumari, Sangeet, Wedding, Grand Reception, Muhurtham).
- **Snapshot Price Safety**: When an Admin updates master prices, existing issued quotations are never corrupted. Service names, descriptions, and prices are snapshotted in each quotation.
- **Precise Financial Math**: Decimal-safe rounding for Subtotals, Percentage/Fixed Discounts, Additional/Travel Charges, GST (18%), and Grand Totals.
- **Flexible Payment Milestones**: Default 5-tier payment schedule (20% Token, 30% Advance, 30% Event Day, 10% Editing, 10% Delivery) or bespoke quotation milestones.
- **A4 Quotation Print & PDF**: Pixel-perfect A4 print layout styled with custom `@media print` CSS. Hides all UI navigation and buttons during print/PDF generation.
- **Live Duplicate Mobile Warning**: Warns staff instantly if a client with the same phone number already exists to prevent duplicate client clutter.
- **Atomic Quotation Numbering**: Thread-safe database sequence generating `SGFX-2026-0001`, `SGFX-2026-0002`, etc.
- **Draft Autosave**: Automatically protects in-progress drafts in browser `localStorage`.
- **Quotation Duplication**: One-click duplication to clone existing quotations into new editable drafts.
- **Backup & Safe Restore**: Download full `.db` snapshots, export JSON, and restore with automatic pre-restore safety snapshots.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| **Backend** | Node.js, Express, Better-SQLite3, JWT Authentication, BcryptJS |
| **Database** | SQLite with WAL mode & Foreign Keys enabled (`data/studio-gfx.db`) |
| **PWA** | Web App Manifest, Service Worker (`sw.js`), Offline caching |
| **Print / PDF** | Native A4 CSS Print Stylesheet with Page Breaks & Print Media isolation |

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js v18+ or v20+ or v22+
- Windows, macOS, or Linux

### 2. Installation
Open PowerShell or Terminal in the project directory:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
npm run build

# Return to root directory
cd ..
```

### 3. Start the Server
From the root directory:
```bash
npm start
```
You will see the studio server banner:
```text
====================================================
       PHOTO PLANET STUDIO QUOTATION SERVER       
====================================================
 Status: Local Server Connected
 Local:   http://localhost:3000
 Network: http://192.168.1.10:3000
 PWA App: http://192.168.1.10:3000/quotation
----------------------------------------------------
 Multiple devices on the same Wi-Fi can connect to:
 http://192.168.1.10:3000
====================================================
```

Open `http://localhost:3000` in your web browser.

---

## 🔐 Default Demo Accounts

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin` | `ChangeMe123!` | Complete administrative control |
| **Quotation Staff** | `quotation` | `ChangeMe123!` | Quotation creator & Client CRM |

> ⚠️ **IMPORTANT**: After logging in for the first time, navigate to **Staff & Access** in the sidebar to change default passwords.

---

## 📱 Connecting Mobile Phones & Tablets Over Local Wi-Fi

1. **Connect to Same Wi-Fi**:
   Ensure your Studio computer and mobile phones/tablets are connected to the same Wi-Fi network router.
2. **Find Your Computer's IP Address**:
   The server automatically detects and displays your Wi-Fi IPv4 address on startup (e.g. `http://192.168.1.10:3000`). You can also click the green **"● Local Server Connected"** pill in the top navbar at any time to view the network address and QR code information.
3. **Open on Phone / Tablet**:
   On your phone's browser (Chrome on Android or Safari on iOS), type:
   ```text
   http://192.168.1.10:3000
   ```
4. **Install PWA App**:
   - **Android (Chrome)**: Tap the three dots menu `⋮` -> Tap **"Add to Home Screen"** or **"Install App"**.
   - **iOS (Safari)**: Tap the Share button `[↑]` -> Tap **"Add to Home Screen"**.
   - The app will now launch full-screen directly from the phone's home screen without browser bars.

---

## 🛡️ Windows Firewall Configuration

If other devices on your studio Wi-Fi cannot open `http://192.168.X.X:3000`, allow port 3000 through Windows Defender Firewall:

1. Press `Windows Key + R`, type `wf.msc`, and press **Enter** (Windows Defender Firewall with Advanced Security).
2. Click **Inbound Rules** on the left panel.
3. Click **New Rule...** on the right panel.
4. Select **Port** -> Click **Next**.
5. Select **TCP** -> In *Specific local ports*, type: `3000` -> Click **Next**.
6. Select **Allow the connection** -> Click **Next**.
7. Keep **Domain**, **Private**, and **Public** checked -> Click **Next**.
8. Name the rule: `Studio GFX Quotation Server (Port 3000)` -> Click **Finish**.

Now all phones and tablets on your local studio network can connect without restriction.

---

## 💾 Database & Backup Management

- Database File: `data/studio-gfx.db`
- **Download Database Backup**: Go to **Backup & Restore** -> Click **"Download SQLite Backup"** to save an atomic `.db` file timestamped copy.
- **Export JSON**: Click **"Export JSON Data"** to download all tables formatted as human-readable JSON.
- **Restore Database**: Select a previous `.db` or `.json` file and click **Restore**. The system will prompt you with an option to create a safety backup of current data before overwriting.

---

## 🧪 Running Automated Tests

A comprehensive integration test suite is included in `tests/api.test.js`:
```bash
npm test
```
Tests:
- Server health and local IP network detection
- Admin and staff JWT authentication
- Backend permission enforcement (rejects staff access to admin settings with 403 Forbidden)
- Master service & pricing creation
- Client creation & live duplicate mobile warning check
- Multi-event quotation generation with decimal-safe calculations
- Automatic atomic numbering sequence (`SGFX-2026-XXXX`)
- Quotation duplication workflow
- Status transitions and audit trail logging
- Backup export validation

---

## 📂 Project Directory Structure

```text
photo planet pwa/
├── backend/
│   ├── server.js               # Express server (0.0.0.0, CORS, SPA static serving)
│   ├── src/
│   │   ├── config.js           # Server port, database paths, JWT secrets
│   │   ├── db.js               # SQLite schema, WAL mode, seeds, sequences
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification & role authorization
│   │   │   └── audit.js        # Audit logging helper
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, logout, change password
│   │   │   ├── users.js        # User management (Admin only)
│   │   │   ├── clients.js      # Clients CRM with duplicate check
│   │   │   ├── events.js       # Event schedules & shoot venues
│   │   │   ├── eventTypes.js   # Event categories (Admin only)
│   │   │   ├── services.js     # Master services & prices (Admin only)
│   │   │   ├── quotations.js   # Multi-event quotation creator, duplicate, status
│   │   │   ├── settings.js     # Studio profile, prefix, legal terms
│   │   │   ├── reports.js      # Business analytics (Admin only)
│   │   │   ├── audit.js        # Audit trail logs
│   │   │   └── backup.js       # Database download & safe restore
│   │   └── utils/
│   │       └── network.js      # Automatic local Wi-Fi IPv4 detection
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Root application orchestrator
│   │   ├── main.tsx            # React root with AuthProvider
│   │   ├── index.css           # Tailwind v4, glassmorphism & A4 print CSS
│   │   ├── types/index.ts      # TypeScript interfaces
│   │   ├── services/api.ts     # API client with auto-heartbeat
│   │   ├── context/AuthContext # Auth state & connection status
│   │   ├── utils/formatters.ts # Indian currency (₹) & date formatting
│   │   └── components/
│   │       ├── Layout/         # Navbar, Sidebar, MobileBottomNav
│   │       ├── Auth/           # LoginView with demo credentials
│   │       ├── Quotation/      # QuotationBuilder, QuotationView (A4), QuotationList
│   │       ├── Clients/        # ClientList, ClientModal, ClientDetailModal
│   │       ├── Events/         # EventList, EventModal
│   │       ├── Admin/          # ServiceMaster, EventTypeMaster, UserManagement,
│   │       │                   # SettingsView, ReportsView, BackupView, AuditLogView
│   │       └── Dashboard/      # Role-tailored DashboardView
│   ├── public/
│   │   ├── manifest.json       # PWA Web App Manifest
│   │   ├── sw.js               # Service Worker for offline app shell
│   │   ├── logo.jpg            # Authentic Studio GFX / Photo Planet logo
│   │   └── icon.jpg            # PWA icons
│   └── package.json
│
├── data/
│   └── studio-gfx.db           # SQLite database
│
├── tests/
│   └── api.test.js             # Automated end-to-end integration tests
│
├── package.json                # Unified root project configuration
├── .env.example
└── README.md
```
#   p h o t o p l a n e t  
 