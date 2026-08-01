# 877finger Search Alias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 877hand homepage eligible for `877finger` searches while preserving all visible homepage content and the HTML title `877hand｜Banana Hand`.

**Architecture:** Extend the root Next.js metadata and existing Organization/WebSite JSON-LD with machine-readable 877finger aliases. Add a server layout around the existing client-side `/finger` page so it can declare its canonical URL and a WebPage `isPartOf` relationship to the root 877hand WebSite without changing its UI. A Node integration test starts the real Next.js application and asserts the HTML metadata and JSON-LD returned over HTTP.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Schema.org JSON-LD, Node.js built-in test runner

## Global Constraints

- Keep the homepage's visible brand and design unchanged.
- Keep the existing homepage title `877hand｜Banana Hand` unchanged.
- Do not modify `app/page.tsx` or any component rendered by the homepage.
- Do not redirect `/finger`, merge it into the homepage, or change its visible UI.
- Do not add hidden keyword text or other search-spam patterns.
- Preserve unrelated local changes in `app/components/providers/AuthProvider.tsx`, `firestore.rules`, and `.claude/launch.json`.
- Do not deploy or request Google Search Console reindexing in this task.

---

### Task 1: Add rendered SEO regression tests

**Files:**
- Create: `tests/seo-metadata.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: the rendered HTML returned by a local Next.js development server
- Produces: npm command `npm run test:seo` and three integration tests for homepage title preservation, 877finger aliases, and `/finger` ownership

- [ ] **Step 1: Add the test command**

Add this script to `package.json` without changing dependencies:

```json
"test:seo": "node --test tests/seo-metadata.test.mjs"
```

- [ ] **Step 2: Write the failing integration tests**

Create `tests/seo-metadata.test.mjs`:

```js
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import test, { after, before } from "node:test"

const projectRoot = fileURLToPath(new URL("..", import.meta.url))
const port = 41877
const baseUrl = `http://127.0.0.1:${port}`

let server
let serverOutput = ""

function extractJsonLd(html) {
  return [...html.matchAll(
    /<script type="application\/ld\+json">([^<]+)<\/script>/g,
  )].map((match) => JSON.parse(match[1]))
}

async function waitForServer() {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before startup:\n${serverOutput}`)
    }

    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // The process is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for Next.js:\n${serverOutput}`)
}

before(async () => {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  )

  server.stdout.on("data", (chunk) => {
    serverOutput += chunk
  })
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk
  })

  await waitForServer()
})

after(() => {
  if (server?.exitCode === null) server.kill("SIGTERM")
})

test("keeps the rendered homepage title branded as 877hand", async () => {
  const html = await fetch(baseUrl).then((response) => response.text())

  assert.match(html, /<title>877hand｜Banana Hand<\/title>/)
  assert.doesNotMatch(html, /<title>[^<]*877finger/i)
})

test("renders 877finger as an alternate name for the homepage", async () => {
  const html = await fetch(baseUrl).then((response) => response.text())
  const schemas = extractJsonLd(html)
  const organization = schemas.find((schema) => schema["@type"] === "Organization")
  const website = schemas.find((schema) => schema["@type"] === "WebSite")

  assert.ok(organization)
  assert.ok(website)
  assert.deepEqual(
    organization.alternateName.filter((name) => name.startsWith("877")),
    ["877finger", "877 finger", "877FINGER"],
  )
  assert.deepEqual(
    website.alternateName.filter((name) => name.startsWith("877")),
    ["877finger", "877 finger", "877FINGER"],
  )
})

test("renders the finger page as part of the 877hand website", async () => {
  const html = await fetch(`${baseUrl}/finger`).then((response) => response.text())
  const schemas = extractJsonLd(html)
  const fingerPage = schemas.find((schema) => schema["@type"] === "WebPage")

  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/877hand\.vercel\.app\/finger"\/>/,
  )
  assert.match(html, /<title>877hand｜Banana Hand<\/title>/)
  assert.ok(fingerPage)
  assert.equal(fingerPage.name, "877finger")
  assert.equal(
    fingerPage.isPartOf["@id"],
    "https://877hand.vercel.app/#website",
  )
})
```

The production changes that make these tests fail are: removing an alias from either root schema, changing the homepage title to 877finger, removing the route canonical, or breaking the `isPartOf` link.

- [ ] **Step 3: Run the test to verify RED**

Run: `npm run test:seo`

Expected: the homepage title test passes. The homepage alias test fails because the rendered schemas do not contain 877finger, and the `/finger` relationship test fails because the rendered page has no WebPage schema linked to 877hand.

- [ ] **Step 4: Commit the failing tests**

```bash
git add package.json tests/seo-metadata.test.mjs
git commit -m "test: define 877finger SEO relationship"
```

---

### Task 2: Add the homepage alias and `/finger` relationship

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/finger/layout.tsx`
- Test: `tests/seo-metadata.test.mjs`

**Interfaces:**
- Consumes: `BASE_URL = "https://877hand.vercel.app"` and the existing root metadata/JSON-LD conventions
- Produces: root `Organization`/`WebSite` alternate names and a `/finger` `WebPage` schema linked through `${BASE_URL}/#website`

- [ ] **Step 1: Extend root search metadata without changing titles**

In `app/layout.tsx`, add the exact values `"877finger"`, `"877 finger"`, and `"877FINGER"` to `metadata.keywords`. Do not change `metadata.title`, `openGraph.title`, `twitter.title`, or any visible React component.

Add `"@id": `${BASE_URL}/#organization`` to `organizationSchema` and include the same three 877finger variants in its `alternateName` array.

Add `"@id": `${BASE_URL}/#website`` to `websiteSchema` and include the same three variants in its `alternateName` array. Link the website back to the organization:

```ts
publisher: {
  "@id": `${BASE_URL}/#organization`,
},
```

- [ ] **Step 2: Add route-specific metadata and JSON-LD for `/finger`**

Create `app/finger/layout.tsx`:

```tsx
import type { Metadata } from "next"

const BASE_URL = "https://877hand.vercel.app"

export const metadata: Metadata = {
  title: {
    absolute: "877hand｜Banana Hand",
  },
  description:
    "877fingerは、877handの中で言葉をバナナに託して共有するインタラクティブコンテンツです。",
  keywords: ["877finger", "877 finger", "877FINGER", "877hand"],
  alternates: {
    canonical: `${BASE_URL}/finger`,
  },
}

const fingerPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${BASE_URL}/finger#webpage`,
  url: `${BASE_URL}/finger`,
  name: "877finger",
  description:
    "877handの中で言葉をバナナに託して共有するインタラクティブコンテンツ。",
  isPartOf: {
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "877hand",
  },
  inLanguage: "ja",
}

export default function FingerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fingerPageSchema) }}
      />
      {children}
    </>
  )
}
```

- [ ] **Step 3: Run the focused test to verify GREEN**

Run: `npm run test:seo`

Expected: 3 tests pass, 0 tests fail.

- [ ] **Step 4: Inspect the production diff**

Run:

```bash
git diff --check -- app/layout.tsx app/finger/layout.tsx package.json tests/seo-metadata.test.mjs
git diff -- app/layout.tsx app/finger/layout.tsx package.json tests/seo-metadata.test.mjs
```

Expected: only metadata, JSON-LD, the test command, and tests changed; `app/page.tsx` and the existing `app/finger/page.tsx` remain untouched.

- [ ] **Step 5: Commit the implementation**

```bash
git add app/layout.tsx app/finger/layout.tsx
git commit -m "feat: associate 877finger with 877hand"
```

---

### Task 3: Verify production behavior

**Files:**
- Verify: `app/layout.tsx`
- Verify: `app/finger/layout.tsx`
- Verify: `tests/seo-metadata.test.mjs`

**Interfaces:**
- Consumes: Next.js production build and ESLint configuration
- Produces: fresh evidence that tests, lint, and build succeed without visible-page code changes

- [ ] **Step 1: Run all focused SEO tests**

Run: `npm run test:seo`

Expected: 3 tests pass, 0 tests fail.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0. If unrelated pre-existing lint failures occur, record their exact paths and verify that the changed files introduce no new lint errors with `npx eslint app/layout.tsx app/finger/layout.tsx tests/seo-metadata.test.mjs`.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 and `/finger` listed among the generated routes.

- [ ] **Step 4: Verify scope and title preservation**

Run:

```bash
git diff HEAD~2 --name-only
git diff HEAD~2 -- app/page.tsx app/finger/page.tsx
rg -n 'default: "877hand｜Banana Hand"|877finger|isPartOf|canonical' app/layout.tsx app/finger/layout.tsx
```

Expected: no diff for `app/page.tsx` or `app/finger/page.tsx`; root title is unchanged; aliases, canonical, and `isPartOf` are present.

- [ ] **Step 5: Report deployment boundary**

Report that the local implementation is verified. State that search engines will only see the change after the commit is pushed/deployed and then recrawled; do not claim that Google ranking or indexing is immediate or guaranteed.
