# Consultant Invoice Submission

Desktop app for consultant invoice submission with role-based access control, admin approvals, and invoice file lifecycle management.

## Roles

- Admin
  - Default login (created automatically at backend startup):
    - Email: `Maryannsimi@gmail.com`
    - Password: `InvoiceDesk`
  - Can approve/reject consultant registrations.
  - Can edit any user details.
  - Can view/edit any invoice.
  - Can approve/reject invoices.
  - Can download approved invoice files (PDF/image).
  - After an approved file is downloaded, the file is deleted from disk.
  - If an invoice is rejected, the file is deleted immediately.

- Consultant
  - Can register account.
  - Login is blocked until admin approval.
  - Can create/edit only their own invoices.
  - Can update their own profile details.

## Invoice File Workflow

Consultants upload invoice file as PDF/image when submitting invoice.

- Allowed types: `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`
- Admin approval state: `pending | approved | rejected`
- Rejected invoice: file deleted immediately.
- Approved invoice: admin can download once, then file is deleted to save space.

## Project Structure

```text
root
+ backend
¦ + controllers
¦ + middleware
¦ + models
¦ + routes
¦ + scripts
¦ + services
¦ + utils
¦ + server.js
+ frontend
¦ + src
¦ ¦ + components
¦ ¦ + context
¦ ¦ + hooks
¦ ¦ + pages
¦ ¦ + services
¦ ¦ + App.jsx
+ tauri-app
¦ + src-tauri
+ scripts
```

## Setup

### 1. Install dependencies

From project root:

```bash
npm run install:all
```

### 2. Configure backend environment

Create env file:

```bash
copy backend/.env.example backend/.env
```

Open `backend/.env` and set these values.

Required:

- `MONGO_URI`
  - Paste your MongoDB connection string here.
  - Example: `MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/consultant_invoice_submission?retryWrites=true&w=majority`
- `JWT_SECRET`
  - Use a long random secret.

Admin defaults (already set in `.env.example`):

- `ADMIN_EMAIL=Maryannsimi@gmail.com`
- `ADMIN_PASSWORD=InvoiceDesk`
- `ADMIN_NAME=Mary Ann`

Optional but recommended:

- SMTP values for real emails:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `EMAIL_FROM`

If SMTP is not configured, app uses JSON transport fallback (no real email delivery).

### 3. (Optional) Seed an approved consultant

```bash
npm --prefix backend run seed:consultant
```

### 4. Run desktop app (backend + frontend + tauri)

```bash
npm run tauri dev
```

### 5. Build desktop app

```bash
npm run tauri build
```

## Main APIs

- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `PUT /api/auth/me`
  - `POST /api/auth/logout`
  - `GET /api/auth/users` (admin)
  - `GET /api/auth/users/pending` (admin)
  - `PATCH /api/auth/users/:userId/approval` (admin)
  - `PUT /api/auth/users/:userId` (admin)

- Invoices
  - `POST /api/invoices`
  - `GET /api/invoices`
  - `GET /api/invoices/:invoiceId`
  - `PUT /api/invoices/:invoiceId`
  - `PATCH /api/invoices/:invoiceId/approval` (admin)
  - `GET /api/invoices/:invoiceId/download` (admin)

## Security

- JWT with HTTP-only cookie session
- Password hashing with bcrypt
- Role-based authorization middleware (`admin`, `consultant`)
- Request validation with `express-validator`
- Input sanitization with `express-mongo-sanitize`
- Helmet security headers
