# 877finger Search Alias Design

**Date:** 2026-08-02
**Project:** 877hand homepage
**Goal:** Make the 877hand homepage eligible to appear for searches for `877finger` without changing the visible brand, page content, or HTML title from 877hand.

## Requirements

- Keep the homepage's visible brand and design unchanged.
- Keep the existing homepage title `877hand｜Banana Hand` unchanged.
- Describe `877finger` to search engines as a related name for the 877hand website.
- Describe `/finger` as a feature page that belongs to the 877hand website.
- Do not redirect `/finger`, merge it into the homepage, or change its visible UI.
- Do not add hidden keyword text or other search-spam patterns.

## Design

### Homepage identity

Extend the existing `Organization` and `WebSite` JSON-LD objects in `app/layout.tsx` so their `alternateName` values include `877finger`. Add the exact variants `877finger`, `877 finger`, and `877FINGER` to the existing metadata keywords. The title, Open Graph title, Twitter title, and visible React content remain unchanged.

### `/finger` relationship

Add a route-specific server layout for `/finger`. It supplies page metadata and JSON-LD describing the page as a `WebPage` named `877finger`, with `isPartOf` pointing to the root `WebSite` at `https://877hand.vercel.app`. Its canonical URL remains `https://877hand.vercel.app/finger` because it is a real, distinct page rather than a duplicate of the homepage.

### Search behavior

The structured data establishes this relationship:

```text
877hand website
├── alternate name: 877finger
└── feature page: /finger (isPartOf 877hand)
```

These signals make the intended relationship machine-readable but cannot guarantee a particular Google ranking or result. Search engines decide when to recrawl and how to rank the site.

## Verification

- Add an automated source-level test that fails until the homepage schemas contain `877finger` and the `/finger` page declares `isPartOf` the 877hand website.
- Run that test before and after implementation to establish the red-green cycle.
- Run ESLint and a production Next.js build.
- Inspect the generated metadata/HTML or source output to confirm:
  - the homepage title remains `877hand｜Banana Hand`;
  - `877finger` appears in machine-readable metadata;
  - `/finger` retains its own canonical URL;
  - no visible homepage component was changed.

## Out of scope

- Redesigning the homepage or `/finger`.
- Changing public-facing branding from 877hand.
- Deploying or requesting reindexing in Google Search Console.
- Guaranteeing ranking position or indexing time.
