# NaijaMart Documentation

Internal documentation for the NaijaMart e-commerce platform.

## How-to Guides

Practical guides for common tasks:

| Document | What you'll learn |
|----------|------------------|
| [Set Up Development Environment](how-to/1-setup-development-environment.md) | Prerequisites, install, configure, start |
| [Run the Project Locally](how-to/2-run-locally.md) | Start servers, verify, troubleshoot |
| [Deploy to Production](how-to/3-deploy-to-production.md) | Docker build, run, health checks |
| [Add a New API Endpoint](how-to/4-add-api-endpoint.md) | Route, store method, validation pattern |
| [Add a New Frontend Page](how-to/5-add-frontend-page.md) | Component, route, auth guard, lazy loading |
| [Add a New Data Model](how-to/6-add-data-model.md) | Mongoose schema, store dual-branch |
| [Configure External Services](how-to/7-configure-external-services.md) | WhatsApp, email, AI setup |
| [Work with In-Memory vs MongoDB](how-to/8-work-with-in-memory-vs-mongodb.md) | Dual-store pattern, switching, gotchas |
| [Debug Common Issues](how-to/9-debug-common-issues.md) | Port conflicts, JWT errors, CORS, build issues |
| [Add a Vendor/Admin Feature](how-to/10-add-vendor-admin-feature.md) | End-to-end feature walkthrough |

## Reference

Technical reference documentation:

| Document | What it covers |
|----------|---------------|
| [API Endpoints](reference/1-api-endpoints.md) | Every route: method, path, auth, request/response |
| [Environment Variables](reference/2-environment-variables.md) | Every env var: required/optional, defaults |
| [Project Structure](reference/3-project-structure.md) | Directory tree with file purposes |
| [Data Models](reference/4-data-models.md) | All Mongoose schemas: fields, types, relationships |
| [Middleware](reference/5-middleware.md) | auth, rateLimit, vendorApproval |
| [Frontend Architecture](reference/6-frontend-architecture.md) | Component hierarchy, routing, state, data flow |
| [Configuration Files](reference/7-config-files.md) | package.json, vite, tailwind, eslint, Dockerfile |

## Explanation

Architectural discussions and design decisions:

| Document | What it explains |
|----------|-----------------|
| [Architecture Overview](explanation/1-architecture-overview.md) | System design, data flow, key decisions |
| [Authentication & Authorization](explanation/2-authentication-authorization.md) | JWT flow, roles, vendor approval |
| [Escrow & Money Flow](explanation/3-escrow-money-flow.md) | Payment → escrow → commission → payout → refund |
| [Multi-Vendor Order Splitting](explanation/4-multi-vendor-order-splitting.md) | Order decomposition, warehouse consolidation |
| [Real-time Notifications](explanation/5-realtime-notifications.md) | Socket.io, WhatsApp, email delivery |
| [Resilience & Error Handling](explanation/6-resilience-error-handling.md) | Circuit breakers, retry, DLQ, graceful shutdown |
| [Frontend State Management](explanation/7-frontend-state-management.md) | Auth context, cart context, product cache |
| [Security Model](explanation/8-security-model.md) | CORS, helmet, rate limiting, input validation |
| [Database Design](explanation/9-database-design.md) | Dual-store pattern, in-memory fallback |
| [Build & Deployment](explanation/10-build-deployment-pipeline.md) | Vite build, Docker, SPA fallback, production server |

## Existing Architecture Docs

Detailed deep-dives (from earlier work):

| Document | Topic |
|----------|-------|
| [Escrow System](architecture/escrow.md) | Money lifecycle, refund paths |
| [Double-Entry Ledger](architecture/ledger.md) | Accounting model, idempotency |
| [Multi-Vendor Orders](architecture/multi-vendor.md) | Order decomposition, fulfillment |
| [Security](architecture/security.md) | Auth, RBAC, upload hardening, circuit breakers |
