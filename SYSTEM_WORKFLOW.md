# System Workflow

This project is strongest when we treat it like a system instead of a collection of separate features. The workflow below gives you a repeatable way to run, extend, and improve the platform.

## 1. Setup Once

1. Add your backend secrets in [backend/.env](./backend/.env).
2. Use [backend/.env.example](./backend/.env.example) as the full configuration reference.
3. Start everything from the repo root with:

```powershell
.\start_system.ps1
```

Useful options:

```powershell
.\start_system.ps1 -SkipInstall
.\start_system.ps1 -BackendOnly
.\start_system.ps1 -FrontendOnly
```

## 2. Build Features Systematically

Use this order for every new feature:

1. Define the student problem clearly.
2. Add or update backend settings first if the feature needs external services.
3. Create backend service logic.
4. Expose the feature through a route.
5. Connect the frontend API client.
6. Build the frontend component.
7. Verify the feature manually and with tests where possible.
8. Document the workflow and environment changes.

## 3. Recommended Delivery Order

To keep the platform organized, work in these tracks:

1. Core platform reliability
   Stabilize config, startup, health checks, logging, and environment management.
2. Learning workflow
   Improve question generation, tutoring, marking, and exam simulation.
3. Content pipeline
   Strengthen PDF ingestion, curriculum fetching, and document indexing.
4. Growth channels
   Add WhatsApp access, offline-first usage, OCR, and audio features.

## 4. Definition of Done

A feature is only complete when all of the following are true:

- Required environment variables are documented.
- Backend route and service behavior are clear.
- Frontend handles loading, success, and failure states.
- The feature does not break `README.md` setup assumptions.
- A teammate can run the system from the repo root without guessing.

## 5. Next Best Steps

If your goal is to make the whole platform systematic, the next high-value improvements are:

1. Add structured logging instead of plain `logging.basicConfig`.
2. Add a root-level task runner (`Makefile`, `justfile`, or npm scripts) for build/test/dev commands.
3. Add backend tests for each API route group.
4. Create feature folders or domain modules if the frontend keeps growing.
