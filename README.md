# @konvert7/promoot

Render a [Promoot](https://promootlabs.com) sponsor slot inline, as part of your own
markup, instead of in an iframe.

```bash
bun add @konvert7/promoot
```

```tsx
import { PromootBlock } from "@konvert7/promoot";

<PromootBlock url="https://promootlabs.com/embed/YOUR_SLOT_ID" />;
```

The `url` is the embed URL from your Promoot dashboard — the same string the iframe
snippet uses, so one value serves either method.

## What it renders

Whatever the sponsor bought, without you choosing:

- **An image ad** — their artwork, cropped to fill the slot.
- **A text ad** — their favicon, a headline, a description and their domain, centred.
  Headline and description are both optional; a link on its own renders the mark and
  the bare domain. If no favicon could be captured, a monogram of the domain's first
  letter is shown instead — never both, so a transparent icon can't show the letter
  through it.

And when nobody has bought it yet, the slot sells itself. If the owner composed an empty
state in their dashboard, it renders as a billboard: the lines they chose — their own
words, the price, the view count, their domain — over a faint chart of the last 30 days
of traffic, with a preview of the visitor's own ad fading in on hover. Owners who never
composed one get the plain pitch instead: headline, audience, proof and terms.

The empty state needs no configuration here. It arrives resolved from the server, so the
words are already the words, and this block only sets them.

## Why inline

An iframe fails closed. If a content filter ever blocks the frame, your sponsor's ad
disappears and they get nothing. An inline block renders inside your own document, so the
worst a filter can do is drop the creative or the view beacon: the ad is still seen.

It also participates in your layout. No fixed-height box to defend, no frame to style
around.

## What it costs you

The creative lives in your DOM, so this is a weaker guarantee for sponsors than the
iframe: nothing stops a site owner swapping or hiding it after approval. If you want that
guarantee, keep the iframe. Both count views identically.

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `url` | `string` | — | Required. The dashboard embed URL. |
| `className` | `string` | — | Applied to the container. |
| `style` | `CSSProperties` | — | Applied to the container. |
| `fallback` | `ReactNode` | `null` | Rendered when the slot is paused, empty, or unreachable. |

## Requirements

A React Server Components framework — Next.js App Router or equivalent. The block fetches
on the server and ships **no client JavaScript**; the view is counted by a plain `<img>`
the visitor's browser loads, which is what keeps the count a first-hand observation rather
than something your server claims.

**The page must render dynamically.** The block fetches with `cache: "no-store"`, but if
your route is statically generated the fetch runs once at build time and an expired ad
keeps rendering — the sponsor gets free time and the next buyer never appears. In Next.js:

```ts
export const dynamic = "force-dynamic";
// or a short revalidate window
export const revalidate = 30;
```

Counting is unaffected by caching, because the beacon is a tag in your HTML that every
visitor's browser fetches regardless of how that HTML was produced.

## Styling

`className` and `style` land on the container, and the internal structure carries
`data-promoot-*` attributes plus `promoot-*` class names you can target.

The block **never declares a colour scheme of its own**. Its palette uses `light-dark()`,
which resolves against the scheme it inherits from your page — so a light-only site keeps
a light panel even for a visitor whose OS prefers dark, and a dark site gets a dark one.
All of its CSS is scoped to the block; nothing is defined on `:root`. The only name it
declares globally is the keyframes the empty state breathes with on touch devices, and
that name carries the slot's own id, so two blocks on one page never collide.

The one thing you cannot restyle is the "Sponsored" label, which renders from inline
styles. Disclosure of a paid placement is not the site owner's to remove.

## License

MIT

