# CI/CD Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions pipeline that gates PRs and `master`, proves the server Docker image builds and renders PDFs, and publishes that image to ghcr.io after a merge.

**Architecture:** Two workflows. `ci.yml` is read-only and runs three parallel jobs (client, server, docker). `publish-image.yml` is the only workflow with `packages: write` and runs after a merge to `master`. Dependabot keeps npm, Docker and Actions dependencies fresh.

**Tech Stack:** GitHub Actions, Node 22, npm, Docker buildx, GitHub Container Registry (ghcr.io).

**Spec:** [docs/superpowers/specs/2026-10-16-ci-cd-setup-design.md](../specs/2026-10-16-ci-cd-setup-design.md)

## Global Constraints

- No deployment and no secrets from the user: publishing uses the built-in `GITHUB_TOKEN` only.
- Node 22 everywhere (the Dockerfile uses `node:22-bookworm-slim`).
- `npm ci` (both apps have a `package-lock.json`).
- Server install in CI uses `--ignore-scripts` (skips the Puppeteer Chrome download).
- Client lint is advisory (`continue-on-error: true`): it has 37 existing errors.
- `ci.yml` has `permissions: contents: read` only; only `publish-image.yml` has `packages: write`.
- Actions are pinned to major versions.
- Image name: `ghcr.io/moneydash/resumeforge-server`, tags `latest` and the commit SHA, platform `linux/amd64`.
- Out of scope: deploy, fixing lint errors, writing tests, multi-arch, vulnerability scanning.

## Review Focus

- A PR from a fork has no secrets and a read-only token: `ci.yml` must not need either (no push, no login).
- The advisory lint step must never turn the client job red, but must still print its errors in the log.
- A docs-only or client-only push to `master` must not republish the server image (path filter).
- The smoke test must run as the non-root `node` user, since that is how the image runs in production.
- Two quick pushes to the same PR must cancel the older run, but a `master` push must never be cancelled (it could skip a publish).

---

## File Structure

| File | Responsibility |
|---|---|
| `.github/workflows/ci.yml` | PR and `master` gate: client, server, docker jobs |
| `.github/workflows/publish-image.yml` | Build and push the server image to ghcr.io on merge |
| `.github/dependabot.yml` | Weekly dependency update PRs |
| `README.md` | CI/CD section |

No application code changes.

### Task 1: CI workflow (client and server jobs)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: workflow `CI` with jobs `client` and `server` (Task 2 adds job `docker` to the same file). Job ids are the names used for branch protection.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [master]

permissions:
  contents: read

# A new push to a PR cancels the older run; a master run is never cancelled.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  client:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      # Advisory: the client has existing ESLint errors. Remove continue-on-error once they are fixed.
      - name: Lint (advisory)
        run: npm run lint
        continue-on-error: true
      - run: npm run build

  server:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json
      # --ignore-scripts skips the Puppeteer postinstall (Chrome is not needed to compile)
      - run: npm ci --ignore-scripts
      - run: npx tsc --noEmit
      - run: npm run build
      # No tests are committed yet; do not fail on that.
      - run: npx vitest run --passWithNoTests
```

- [ ] **Step 2: Validate the YAML parses**

Run: `python -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(list(d['jobs']))"`
Expected: `['client', 'server']`

- [ ] **Step 3: Run each job's commands locally**

Run: `cd client && npm ci && npm run build` then `cd ../server && npm ci --ignore-scripts && npx tsc --noEmit && npm run build && npx vitest run --passWithNoTests`
Expected: both pass (vitest prints "No test files found" and exits 0). `npm run lint` in `client/` still fails; that is expected and advisory.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add client and server checks"
```

### Task 2: Docker job with Chrome smoke test

**Files:**
- Modify: `.github/workflows/ci.yml` (append job `docker` under `jobs:`)

**Interfaces:**
- Consumes: workflow `CI` from Task 1.
- Produces: job `docker`; image tag `resumeforge-server:ci` (local to the runner only); build cache scope `server` (reused by Task 3).

- [ ] **Step 1: Append the job**

```yaml
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build server image (not pushed)
        uses: docker/build-push-action@v6
        with:
          context: server
          load: true
          push: false
          provenance: false
          tags: resumeforge-server:ci
          cache-from: type=gha,scope=server
          cache-to: type=gha,scope=server,mode=max
      # Chrome is the part of the image that breaks silently: render a PDF as the image's non-root user.
      - name: Smoke test (Chrome renders a PDF as non-root)
        run: |
          docker run --rm --entrypoint node resumeforge-server:ci -e "const p=require('puppeteer');(async()=>{const b=await p.launch({headless:true,args:['--no-sandbox']});const pg=await b.newPage();await pg.setContent('<h1>hi</h1>');const pdf=await pg.pdf();if(process.getuid()===0||pdf.length<1000){throw new Error('uid='+process.getuid()+' pdf='+pdf.length)}console.log('pdf bytes',pdf.length,'uid',process.getuid());await b.close()})().catch(e=>{console.error(e.message);process.exit(1)})"
```

- [ ] **Step 2: Validate the YAML parses**

Run: `python -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(list(d['jobs']))"`
Expected: `['client', 'server', 'docker']`

- [ ] **Step 3: Run the build and smoke test locally**

Run: `docker build -t resumeforge-server:ci server` then the same `docker run ... node -e "..."` command from Step 1.
Expected: build succeeds; output `pdf bytes <n> uid 1000`, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build the server image and smoke-test Chrome"
```

### Task 3: Publish workflow

**Files:**
- Create: `.github/workflows/publish-image.yml`

**Interfaces:**
- Consumes: build cache scope `server` from Task 2.
- Produces: image `ghcr.io/<owner>/resumeforge-server` tagged `latest` and `sha-<short>`.

- [ ] **Step 1: Write the workflow**

```yaml
name: Publish server image

on:
  push:
    branches: [master]
    paths:
      - 'server/**'
      - '.github/workflows/publish-image.yml'
  workflow_dispatch:

permissions:
  contents: read
  packages: write

# Never cancel a publish half way; queue the next one.
concurrency:
  group: publish-image
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      # metadata-action lowercases the image name (ghcr.io requires lowercase)
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/resumeforge-server
          tags: |
            type=raw,value=latest
            type=sha
      - uses: docker/build-push-action@v6
        with:
          context: server
          push: true
          provenance: false
          platforms: linux/amd64
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=server
          cache-to: type=gha,scope=server,mode=max
```

- [ ] **Step 2: Validate the YAML parses and the triggers are right**

Run: `python -c "import yaml; d=yaml.safe_load(open('.github/workflows/publish-image.yml')); t=d.get(True) or d['on']; print(t['push']['paths'], d['permissions'])"`
Expected: the two paths, and `{'contents': 'read', 'packages': 'write'}`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish-image.yml
git commit -m "ci: publish the server image to ghcr.io on merge"
```

### Task 4: Dependabot and README

**Files:**
- Create: `.github/dependabot.yml`
- Modify: `README.md` (add a `## CI/CD` section before `## Folder Structure`)

- [ ] **Step 1: Write dependabot.yml**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /client
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /server
    schedule:
      interval: weekly
  - package-ecosystem: docker
    directory: /server
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 2: Add the README section**

````markdown
## CI/CD

GitHub Actions runs two workflows (see `.github/workflows/`):

| Workflow | When | What it does |
|---|---|---|
| `CI` | Every pull request and push to `master` | **client:** install, lint (advisory for now), build. **server:** install, type-check, build, tests. **docker:** builds the server image and checks that Chrome can render a PDF inside it. |
| `Publish server image` | After a merge to `master` that changes `server/` (or manually) | Pushes the server image to GitHub Container Registry as `latest` and `sha-<commit>`. |

Pull the published image with:

```bash
docker pull ghcr.io/moneydash/resumeforge-server:latest
```

The image needs a MySQL database and the variables from `server/.env` to run (see the Docker setup above). Nothing is deployed automatically. Dependabot opens weekly update PRs for npm, the Dockerfile and the workflows.
````

- [ ] **Step 3: Validate the YAML parses**

Run: `python -c "import yaml; d=yaml.safe_load(open('.github/dependabot.yml')); print(len(d['updates']))"`
Expected: `4`

- [ ] **Step 4: Commit**

```bash
git add .github/dependabot.yml README.md
git commit -m "ci: add dependabot and document the pipeline"
```

### Task 5: Whole-pipeline verification

**Files:** none (verification only)

- [ ] **Step 1: Lint the workflows if actionlint is available**

Run: `actionlint .github/workflows/*.yml || echo "actionlint not installed"`
Expected: no findings, or the "not installed" note (then rely on the YAML parse checks above).

- [ ] **Step 2: Confirm the Review Focus items in the files**

Run: `grep -n "cancel-in-progress\|continue-on-error\|packages: write\|paths:\|getuid" .github/workflows/*.yml`
Expected: `ci.yml` cancels only for `pull_request`; lint has `continue-on-error: true`; `packages: write` appears only in `publish-image.yml`; publish has the `paths:` filter; the smoke test checks `getuid()`.

- [ ] **Step 3: Report what needs GitHub**

Tell the user the real confirmation is the first PR run, and the manual steps: add branch protection on `master` with the `client`, `server` and `docker` checks, and set the ghcr package visibility after the first publish.
