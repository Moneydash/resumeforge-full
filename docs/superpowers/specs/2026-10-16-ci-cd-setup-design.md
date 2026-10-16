# CI/CD Setup (GitHub Actions) - Design

Date: 2026-10-16
Branch: `ci-cd-setup` (follows `server-dockerization`, which added the backend Dockerfile and compose stack)

## Goal

Add a GitHub Actions pipeline that gates pull requests and `master`, proves the server Docker image builds and can render PDFs, and publishes that image to GitHub Container Registry after a merge. **No deployment**: the backend's hosting target is not decided yet.

## Decisions (from the user)

- Scope: CI checks plus publishing the server image to ghcr.io. No deploy, no secrets from the user.
- Client lint is **advisory** for now: it has 37 existing ESLint errors, so a required lint would fail every PR. It shows its result without blocking.
- Structure: two workflows (CI, publish) so the PR workflow stays read-only.

## Baseline found before designing

- Server: `tsc --noEmit` passes. No test files are committed (tests are deleted before commit), so `vitest run` exits 1 unless told to pass with no tests.
- Client: `npm run lint` fails (37 errors, 17 warnings). No committed tests either.
- Both apps have a `package-lock.json`: `npm ci` is used. The Dockerfile uses Node 22, so CI uses Node 22.

## Files

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | PR and `master` gate |
| `.github/workflows/publish-image.yml` | Push the server image to ghcr.io after a merge |
| `.github/dependabot.yml` | Weekly dependency updates |
| `README.md` | Short CI/CD section |

## ci.yml

- Triggers: `pull_request`, and `push` to `master`. A new run cancels an older run of the same ref (`concurrency`).
- Permissions: `contents: read` only.
- Actions are pinned to major versions.
- Jobs (run in parallel):
  - **client** (`working-directory: client`): setup Node 22 with the npm cache, `npm ci`, `npm run lint` with `continue-on-error: true` (advisory), `npm run build`.
  - **server** (`working-directory: server`): setup Node 22 with the npm cache, `npm ci --ignore-scripts` (skips the Puppeteer Chrome download; Chrome is not needed to compile), `npx tsc --noEmit`, `npm run build`, `npx vitest run --passWithNoTests`.
  - **docker**: buildx build of `server/Dockerfile` with the GitHub Actions cache, loaded locally and not pushed. Then a smoke test inside the built image: launch Chrome through Puppeteer and render a PDF as the non-root user (the part of the image that breaks silently).

## publish-image.yml

- Triggers: push to `master` when `server/**` or the workflow itself changes, plus `workflow_dispatch`.
- Permissions: `contents: read`, `packages: write`.
- Logs in to `ghcr.io` with the built-in `GITHUB_TOKEN`.
- Pushes `ghcr.io/moneydash/resumeforge-server` (owner lowercased) with tags `latest` and the commit SHA. Platform `linux/amd64`. Uses the same build cache as CI.

## dependabot.yml

Weekly updates for npm in `/client` and `/server`, the Dockerfile in `/server`, and GitHub Actions in `/`.

## README

A short "CI/CD" section: what each workflow does, how to pull the image (`docker pull ghcr.io/moneydash/resumeforge-server:latest`), and that the server image needs a MySQL and a `.env` to run.

## Manual steps for the user (cannot be done from the repo)

- In GitHub, add branch protection on `master` with the `client`, `server` and `docker` jobs as required checks.
- After the first publish, set the ghcr package visibility if it should be public.

## Out of scope

Deployment, fixing the client lint errors, writing tests, multi-arch images, and image vulnerability scanning.

## Verification

- Validate the workflow YAML locally (parse check, and `actionlint` if available).
- Run each job's commands locally where possible: client build, server type-check and build, the Docker build and the Chrome smoke test.
- Real confirmation comes from the first PR run on GitHub.
