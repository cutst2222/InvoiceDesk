# Consultant Invoice Submission

A production-ready desktop application for consultant invoice operations with role-based access control, approval workflow, and secure file lifecycle management.

## Overview

This application enables consultants to register, submit invoices, and manage their own records. Admin users approve consultants, review invoices, and control final approval, viewing, download, and deletion.

The system is built as:

- `frontend`: React + Vite desktop UI
- `backend`: Express + MongoDB API
- `tauri-app`: Tauri desktop wrapper (Rust)

## Key Features

- Role-based access (`admin`, `consultant`)
- Consultant registration with admin approval gate
- JWT authentication with HTTP-only cookie session
- Invoice create, edit, and delete (ownership enforced)
- Admin invoice approval / rejection
- Admin invoice file view and download
- File lifecycle cleanup to reduce storage usage
- INR currency formatting (`en-IN`)
- Optional SMTP email notifications with safe fallback
- Dark mode toggle (persisted locally)

## Technology Stack

### Frontend

- React (Vite)
- TailwindCSS
- React Hook Form
- Axios

### Backend

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT auth
- bcrypt password hashing
- Nodemailer
- Puppeteer

### Desktop

- Tauri (Rust)

## Project Structure

```text
InvoiceDesk/
  backend/
    controllers/
    middleware/
    models/
    routes/
    scripts/
    services/
    utils/
    server.js
  frontend/
    src/
      components/
      context/
      hooks/
      pages/
      services/
      App.jsx
  tauri-app/
    src-tauri/
  scripts/
```

## Application Pipeline

### 1. User Onboarding Pipeline

1. Consultant registers via `POST /api/auth/register`
2. Account status is set to `pending`
3. Admin reviews pending consultants and approves/rejects
4. Consultant login is allowed only when status is `approved`

### 2. Authentication Pipeline

1. User logs in with email/password
2. Backend validates credentials (`bcrypt`)
3. JWT is issued and stored in an HTTP-only cookie
4. Protected routes enforce authentication + role checks

### 3. Invoice Submission Pipeline

1. Approved consultant submits invoice form
2. Backend validates all required fields
3. Invoice file (image or PDF) is stored in server storage
4. Invoice document is saved in MongoDB with `pending` status
5. A generated PDF summary is created via Puppeteer
6. Confirmation/admin emails are attempted (non-blocking fallback)

### 4. Invoice Review Pipeline (Admin)

1. Admin reviews invoice details and file
2. Admin can approve or reject
3. If rejected:
   - Invoice file is deleted immediately
4. If approved:
   - Admin can view file inline
   - Admin can download file
   - After download, file is deleted from disk

### 5. Invoice Ownership + Deletion Pipeline

- Consultant can edit/delete only own invoices
- Admin can edit/delete any invoice
- Deletion removes associated file from storage and document from database

## Roles and Permissions

### Admin

- Default bootstrap user is created automatically at backend startup
- Can approve/reject consultant registrations
- Can edit any user
- Can view/edit/approve/reject/delete any invoice
- Can view and download approved invoice files

### Consultant

- Can register and update own profile
- Must be approved by admin before login actions
- Can create/edit/delete only own invoices

## Environment Configuration

Create env file:

```bash
copy backend/.env.example backend/.env
```

Update [backend/.env](c:/Users/joshu/consultant-invoice-app/InvoiceDesk/backend/.env):

Required:

- `MONGO_URI`
- `JWT_SECRET`

Admin bootstrap:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Optional email config:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `SMTP_DISABLED=true` (force local fallback)

## Setup and Run

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start desktop development mode

```bash
npm run tauri dev
```

This starts:

- Backend API (`backend`)
- Frontend Vite server (`frontend`)
- Tauri desktop shell (`tauri-app`)

### 3. Build desktop app

```bash
npm run tauri build
```

## API Summary

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/users` (admin)
- `GET /api/auth/users/pending` (admin)
- `PATCH /api/auth/users/:userId/approval` (admin)
- `PUT /api/auth/users/:userId` (admin)

### Invoices

- `POST /api/invoices`
- `GET /api/invoices`
- `GET /api/invoices/:invoiceId`
- `PUT /api/invoices/:invoiceId`
- `DELETE /api/invoices/:invoiceId`
- `PATCH /api/invoices/:invoiceId/approval` (admin)
- `GET /api/invoices/:invoiceId/view` (admin)
- `GET /api/invoices/:invoiceId/download` (admin)

## Security Controls

- JWT session cookie (`httpOnly`, same-site)
- Password hashing with bcrypt
- Role-based middleware authorization
- Input validation (`express-validator`)
- Input sanitization (`express-mongo-sanitize`)
- Security headers (`helmet`)

## Notes

- Currency display is INR.
- Dark mode is available via UI toggle.
- Invoice file types supported: PDF, PNG, JPG, JPEG.
