# Campus Venue and Facility Reservation System

**Course & Section:** BSIT 2-C
**Group:** Group 5
**Adviser:** John Fredrick Lim
**Course:** ITPC 103 & ITPE 101 – Final Project
**Institution:** ZPPSU

## Team Members

- Jamsani, Hajar A.
- Ramos, Joem Ryan
- Veñales, Justin M.
- Bandoles, Mark Florence G.
- Coligado, Cristian C.
- Gonzales, Christian

## About the Project

Reservations for venues and facilities inside the ZPPSU campus are still processed manually. This takes time and is hard to manage when multiple requests overlap. This system lets users view available venues and submit reservation requests, while administrators review, approve, and manage them without scheduling conflicts.

### Objectives

- Track venue availability, reservations, schedules, and status.
- Let users set a schedule whenever they need to.
- Let authorized staff and administrators review, approve, reject, and manage reservation requests.

### Main Features

- List of Venues and Facilities
- Availability and Schedule Checking
- Reservation Request
- Approval and Conflict Validation
- Reservation Tracking and Reports

### Intended Users

Students, Faculty Members, University Staff, and Campus Administrators.

### Scope and Limitations

- Covers reservation and management of selected campus venues and facilities.
- Does not support off-campus facilities.
- Does not support third-party booking.
- Does not automatically approve requests without the required staff review.

## Tech Stack

| Layer | Tool |
|---|---|
| Platform | Web application |
| Front end | ReactJS |
| Database | MySQL |

## Project Structure

```
campus-venue-reservation-system/
├── docs/          # Project proposal and documentation
├── frontend/      # ReactJS (Vite) source code
├── backend/       # Node.js + Express API
├── database/      # MySQL scripts (schema, sample data)
└── README.md
```

## Proposal

See [`docs/G5-Proposal.pptx`](docs/G5-Proposal.pptx) (dated October 16, 2026).

## How to Run

**1. Database** – open MySQL (XAMPP / MySQL Workbench) and run `database/schema.sql`.

**2. Backend**
```
cd backend
npm install
cp .env.example .env      # then edit DB_PASSWORD and JWT_SECRET
npm run seed              # creates the admin account
npm run dev
```
Default admin login: `admin@zppsu.edu.ph` / `admin123` (change it in `.env` before seeding).

**3. Frontend** (new terminal)
```
cd frontend
npm install
npm run dev
```
Open the link Vite prints (usually http://localhost:5173).

## Features Implemented

- Register / log in (students, faculty, staff) and an admin role
- List of venues and facilities, with admin add / edit / remove
- Availability and schedule checking per venue and date
- Reservation requests with automatic conflict validation
- Admin approve / reject, with conflict re-check on approval
- Reservation tracking (users can cancel their own) and admin reports
