# `api/` — The API Layer

## What Is an API Layer?

An **API layer** is the outermost boundary of a backend application. It is the only part of the system that is directly exposed to external clients (browsers, mobile apps, other services). Its sole job is to:

1. **Receive** incoming HTTP requests.
2. **Validate** that those requests are authenticated and authorized.
3. **Delegate** all business logic to the appropriate module (controller/service).
4. **Return** an HTTP response with the result.

The API layer **does not** perform business logic itself. It owns the HTTP interface, not the domain behaviour.

---

## Why `backend/api/` Is the API Layer

### 1. `server.ts` — The Entry Point

```
app.use("/api/auth",     authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/audit",    auditRoutes);
app.use("/api/admin",    adminRoutes);
```

`server.ts` creates the Express application, mounts every route under a versioned `/api/...` prefix, and applies the global error-handling middleware. It defines *what URLs exist* and *in what order* middleware runs — purely an HTTP concern, with zero business logic.

---

### 2. `routes/` — HTTP Contract Definition

Each route file maps an HTTP verb + path to a handler:

| File | Path prefix | Who can call it |
|---|---|---|
| `auth.routes.ts` | `/api/auth` | Anyone (public login) |
| `invoice.routes.ts` | `/api/invoices` | Authenticated VENDOR / ADMIN / LENDER |
| `audit.routes.ts` | `/api/audit` | ADMIN only |
| `admin.routes.ts` | `/api/admin` | ADMIN only |

The routes are thin — they apply middleware and then call a controller. No conditional logic, no database queries, no fraud scoring. Those concerns live in `modules/`.

---

### 3. `middlewares/` — Cross-Cutting HTTP Concerns

| Middleware | Responsibility | Why it belongs in the API layer |
|---|---|---|
| `auth.middleware.ts` | Validates the `Authorization: Bearer <token>` header and attaches `req.user` | JWT extraction is an HTTP-protocol concern, not a domain concern |
| `rbac.middleware.ts` | Checks `req.user.role` against the route's allowed roles | Access control at the transport boundary |
| `error.middleware.ts` | Catches unhandled errors and returns a consistent `500` JSON response | HTTP error serialisation |

These middlewares intercept the **request pipeline** before it reaches business logic, and intercept the **response pipeline** before it reaches the client. That pipeline *is* the API layer.

---

## How the API Layer Relates to the Rest of the System

```
React Frontend
      │  HTTP (JSON)
      ▼
┌──────────────────────────────┐
│          api/                │  ← YOU ARE HERE
│  server.ts                   │  Entry point, route mounting
│  routes/  (auth, invoices…)  │  HTTP contract
│  middlewares/ (auth, rbac…)  │  Cross-cutting concerns
└──────────┬───────────────────┘
           │  function calls (TypeScript)
           ▼
┌──────────────────────────────┐
│        modules/              │  Business logic
│  auth / invoices / fraud …   │  Controllers, Services, Models
└──────────┬───────────────────┘
           │  SQL / Redis
           ▼
┌──────────────────────────────┐
│      infrastructure/         │  Database, cache, config
└──────────────────────────────┘
```

The API layer sits **between** the outside world and the application's core. It translates HTTP into function calls on the way in, and function return values into HTTP responses on the way out. Route and middleware files call into `modules/` only; `server.ts` reads the server port from `infrastructure/config/env` (an acceptable infrastructure-config import) but contains no domain logic of its own.

---

## Summary

| Property | Value |
|---|---|
| **Owns** | HTTP routes, middleware pipeline, request/response serialisation |
| **Delegates** | All domain logic to `modules/` |
| **Does not contain** | Database queries, fraud scoring, JWT signing, business rules |
| **Enforces** | Authentication and role-based access control at the transport boundary |
