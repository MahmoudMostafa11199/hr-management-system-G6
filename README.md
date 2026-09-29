# HR Management System

A full-featured HR Management System backend built with NestJS, Prisma & PostgreSQL — covering attendance tracking, multi-level leave approval, task management, automated payroll calculation, and real-time notifications across 5 role-based dashboards (Admin, HR, Manager, Employee, Security).

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat) [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/) [![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Tech Stack

### Backend

- [NestJS](https://nestjs.com/) — Node.js framework
- [Prisma](https://www.prisma.io/) — ORM
- [PostgreSQL](https://www.postgresql.org/) — Database
- [TypeScript](https://www.typescriptlang.org/)
- [Socket.io](https://socket.io/) — Real-time notifications
- [JWT](https://jwt.io/) — Authentication (httpOnly cookies)
- [Swagger](https://swagger.io/) — API documentation
- [ExcelJS](https://github.com/exceljs/exceljs) — Excel report export
- [pdfmake](http://pdfmake.org/) — Payslip PDF generation

### Tooling

- pnpm workspaces (monorepo)
- class-validator / class-transformer — DTO validation

### Frontend _(planned)_

- Angular — UI designs completed, integration in progress

---

## Features

- **Role-based access** — 5 roles (Admin, HR Manager, Manager/Team Lead, Employee, Security Officer), each with scoped permissions and a dedicated dashboard
- **Attendance tracking** — check-in/check-out with automatic late/present detection based on configurable shift schedules, monthly & department-level reports (Excel export), automated end-of-day absence marking (cron job)
- **Leave management** — two-step approval chain (Manager → HR), leave balance tracking per type, automatic attendance sync for approved leave days
- **Task management** — assignment, status workflow with history tracking, comments, deadline tracking, performance scoring (on-time rate, overdue rate)
- **Payroll** — automated calculation with attendance/lateness/overdue-task deductions, versioned payroll configuration, payslip generation with PDF export
- **Real-time notifications** — Socket.io-powered live updates for approvals, task changes, and payslip finalization
- **Dashboards** — role-specific analytics (attendance trends, department headcount, pending approvals, team performance, payroll summaries)
- **API documentation** — full Swagger/OpenAPI docs with cookie-based auth support

---

## Architecture

- **Monorepo** structure (pnpm workspaces) with separate `backend/` (NestJS) and `frontend/` (Angular, in progress) packages
- **Modular design** — each domain (Employees, Departments, Attendance, Permissions, Tasks, Payroll, Notifications, Dashboard) is a self-contained NestJS module with its own controller, service, and DTOs
- **Authentication** — JWT stored in an httpOnly cookie, validated via a global `JwtAuthGuard`; role-based routes enforced with a custom `RolesGuard`
- **Database** — PostgreSQL via Prisma ORM; schema defined in `prisma/schema.prisma`
- **Real-time layer** — a dedicated Socket.io gateway (`NotificationsGateway`) authenticates the same JWT cookie and pushes live notifications per-user via Socket.io rooms
- **Scheduled jobs** — `@nestjs/schedule` cron job for automatic end-of-day absence marking

### Leave Request Flow

1. Employee submits a `PermissionRequest`
2. Manager reviews → approves (routes to HR if the leave type requires HR approval) or rejects
3. HR gives final approval → leave balance is deducted and `ON_LEAVE` attendance records are created for each day in the range, all within a single transaction

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm
- PostgreSQL (running locally or via Docker)

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/MahmoudMostafa11199/hr-management-system.git
   cd hr-management-system
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Set up environment variables

   ```bash
   cd backend
   cp .env.example .env
   ```

   Fill in your database credentials, JWT secret, and mail config in `.env`.

4. Run database migrations

   ```bash
   pnpm prisma migrate dev
   ```

5. (Optional) Seed the database with test data

   ```bash
   pnpm prisma db seed
   ```

6. Start the development server

   ```bash
   pnpm run start:dev
   ```

The API will be available at `http://localhost:2215`, and Swagger docs at `http://localhost:2215/swagger`.

---

## API Documentation

Full interactive API documentation is available via Swagger once the server is running:

**http://localhost:2215/swagger**

- All protected endpoints use a JWT stored in an httpOnly cookie
- To test protected routes: use the `POST /auth/login` endpoint directly from the Swagger UI (same origin), then call any other endpoint — the browser will automatically send the auth cookie
- Endpoints are grouped by module (Attendance, Permissions, Tasks, Payroll, Notifications, Dashboard, ...)

---

## Author

**Mahmoud Mostafa**

- GitHub: [@MahmoudMostafa11199](https://github.com/MahmoudMostafa11199)
- LinkedIn: [Mahmoud Mostafa](https://www.linkedin.com/in/mahmoudmostafa99)

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
