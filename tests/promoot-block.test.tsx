import { afterEach, describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PromootBlock, blockEndpoint } from "../src/promoot-block.js";
import type { BlockPayload } from "../src/types.js";

const embedUrl = "https://promootlabs.com/embed/slot_1";

const payload: BlockPayload = {
  slot: { id: "slot_1", widthPx: 400, heightPx: 100, sponsoredLabel: "Sponsored" },
  render: "pitch",
  ad: null,
  pitch: {
    headline: "Sponsor this spot for $50",
    pitch: "Read by 4,000 developers",
    proof: "Seen 1,240 times in the last 30 days",
    terms: "Yours for 7 days",
    purchaseUrl: "https://promootlabs.com/s/slot_1",
  },
  beaconUrl: "https://promootlabs.com/v/slot_1",
  paletteVars: "--surface: light-dark(#fafafa, #18181b); --ink: light-dark(#18181b, #fafafa)",
};

const runningAd: BlockPayload = {
  ...payload,
  render: "ad",
  pitch: null,
  ad: {
    kind: "IMAGE",
    title: "Try Acme",
    imageUrl: "https://cdn.promootlabs.com/creative.png",
    clickUrl: "https://promootlabs.com/c/ad_1",
    expiresAt: "2026-09-02T00:00:00.000Z",
  },
};

const realFetch = globalThis.fetch;

function answerWith(body: BlockPayload | null, ok = true): string[] {
  const seen: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seen.push(String(input));
    return { ok, json: async () => body } as Response;
  }) as typeof fetch;

  return seen;
}

async function render(props: Parameters<typeof PromootBlock>[0]): Promise<string> {
  return renderToStaticMarkup(await PromootBlock(props));
}

// The stylesheet names every class whether or not the markup uses it, so a
// question about what was rendered has to be asked of the markup alone.
async function markup(props: Parameters<typeof PromootBlock>[0]): Promise<string> {
  const html = await render(props);

  return html.slice(html.indexOf("</style>"));
}

async function stylesheet(): Promise<string> {
  const html = await render({ url: embedUrl });

  return html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
}

// "A, B { … } C { … }" reads as three selectors, so a rule cannot smuggle an
// unscoped one in after a comma.
function selectorsIn(block: string): string[] {
  return block
    .split("}")
    .map((chunk) => (chunk.split("{")[0] ?? "").trim())
    .filter(Boolean)
    .flatMap((selector) => selector.split(",").map((one) => one.trim()));
}

function selectorsOf(rule: string): string[] {
  if (rule.startsWith("@keyframes")) {
    return [];
  }

  return rule.startsWith("@media")
    ? selectorsIn(rule.slice(rule.indexOf("{") + 1, rule.lastIndexOf("}")))
    : selectorsIn(rule);
}

async function unscopedSelectors(): Promise<string[]> {
  const css = await stylesheet();

  return css
    .split("\n")
    .flatMap(selectorsOf)
    .filter((selector) => !selector.startsWith('[data-promoot-slot="slot_1"]'));
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("the endpoint it calls", () => {
  it("turns the dashboard embed url into the block url", () => {
    expect(blockEndpoint(embedUrl)).toBe("https://promootlabs.com/api/block/slot_1");
  });

  it("asks the server, not the iframe route", async () => {
    const seen = answerWith(payload);

    await render({ url: embedUrl });

    expect(seen).toEqual(["https://promootlabs.com/api/block/slot_1"]);
  });
});

describe("the space it holds", () => {
  // A slot's aspect ratio alone crushes the pitch on a narrow phone: a 400x100
  // block is 25px tall inside a 100px column, and its text does not shrink.
  it("never lets the block get shorter than the pitch needs", async () => {
    answerWith(payload);
    const html = await render({ url: embedUrl });

    expect(html).toContain("min-height: 88px");
  });

  it("floors a short slot at its own height, never taller", async () => {
    answerWith({ ...payload, slot: { ...payload.slot, heightPx: 60 } });
    const html = await render({ url: embedUrl });

    expect(html).toContain("min-height: 60px");
    expect(html).not.toContain("min-height: 88px");
  });
});

describe("what it renders", () => {
  it("shows the pitch for an empty slot", async () => {
    answerWith(payload);

    const html = await render({ url: embedUrl });

    expect(html).toContain("Sponsor this spot for $50");
    expect(html).toContain("Yours for 7 days");
    expect(html).toContain("Seen 1,240 times in the last 30 days");
    expect(html).toContain('href="https://promootlabs.com/s/slot_1"');
  });

  it("shows the creative when an ad is running", async () => {
    answerWith(runningAd);

    const html = await render({ url: embedUrl });

    expect(html).toContain('src="https://cdn.promootlabs.com/creative.png"');
    expect(html).toContain('href="https://promootlabs.com/c/ad_1"');
    expect(html).toContain('rel="noopener nofollow sponsored"');
  });

  it("always carries the beacon, so the view is counted by the browser", async () => {
    answerWith(runningAd);

    const html = await render({ url: embedUrl });

    expect(html).toContain('src="https://promootlabs.com/v/slot_1"');
    expect(html).toContain('class="promoot-beacon"');
  });
});

const textAd: BlockPayload = {
  ...payload,
  render: "ad",
  pitch: null,
  ad: {
    kind: "TEXT",
    headline: "Claim your plot",
    body: "A tiny land grab game",
    faviconUrl: "https://cdn.promootlabs.com/ads/slot_1/favicon-1.png",
    host: "landgrab.lol",
    monogram: "L",
    clickUrl: "https://promootlabs.com/c/ad_2",
    expiresAt: null,
  },
};

describe("a text ad", () => {
  it("shows the headline, description and host", async () => {
    answerWith(textAd);

    const html = await render({ url: embedUrl });

    expect(html).toContain("Claim your plot");
    expect(html).toContain("A tiny land grab game");
    expect(html).toContain("landgrab.lol");
  });

  it("shows the sponsor's own mark when one was captured", async () => {
    answerWith(textAd);

    const html = await render({ url: embedUrl });

    expect(html).toContain('src="https://cdn.promootlabs.com/ads/slot_1/favicon-1.png"');
    expect(html).not.toContain(">L<");
  });

  // Never both: a favicon with transparent corners would show the letter
  // through it, and a broken image over the letter hides it anyway.
  it("falls back to the monogram when there is no favicon", async () => {
    answerWith({ ...textAd, ad: { ...textAd.ad, faviconUrl: null } as typeof textAd.ad });

    const html = await render({ url: embedUrl });

    expect(html).toContain(">L<");
    expect(html).not.toContain("<img src=\"null\"");
  });

  it("renders a link-only ad as the bare host", async () => {
    answerWith({
      ...textAd,
      ad: { ...textAd.ad, headline: null, body: null } as typeof textAd.ad,
    });

    const html = await markup({ url: embedUrl });

    expect(html).toContain("landgrab.lol");
    expect(html).not.toContain("promoot-headline");
    expect(html).not.toContain("promoot-desc");
  });

  it("still routes the click through the counter", async () => {
    answerWith(textAd);

    expect(await render({ url: embedUrl })).toContain(
      'href="https://promootlabs.com/c/ad_2"'
    );
  });
});

describe("what it refuses to do to the host page", () => {
  it("never defines anything on :root", async () => {
    answerWith(payload);

    expect(await render({ url: embedUrl })).not.toContain(":root");
  });

  // Declaring a scheme opts the block into dark on a light-only site, which is
  // right inside an iframe and wrong inside someone else's document.
  it("never declares a colour scheme of its own", async () => {
    answerWith(payload);

    expect(await render({ url: embedUrl })).not.toContain("color-scheme");
  });

  it("scopes every selector to its own slot, inside media queries too", async () => {
    answerWith(payload);

    expect(await unscopedSelectors()).toEqual([]);
  });

  // A keyframe name is the one thing css cannot scope to a selector, so it has
  // to carry the slot's id or two blocks on a page would fight over the name.
  it("names its keyframes after the slot", async () => {
    answerWith(payload);
    const names = [...(await stylesheet()).matchAll(/@keyframes (\S+)/g)].map(
      ([, name]) => name
    );

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toContain("slot_1");
    }
  });
});

describe("the sponsored label", () => {
  it("renders from inline styles a host class cannot override", async () => {
    answerWith(runningAd);

    const html = await render({ url: embedUrl });

    expect(html).toMatch(/<span style="[^"]*">Sponsored<\/span>/);
  });

  it("is absent when the owner turned disclosure off", async () => {
    answerWith({ ...runningAd, slot: { ...runningAd.slot, sponsoredLabel: null } });

    expect(await render({ url: embedUrl })).not.toContain("Sponsored");
  });
});

// The owner composes up to three lines in their dashboard; the server resolves
// them into words and this block only sets them.
const billboard: BlockPayload = {
  ...payload,
  pitch: {
    ...(payload.pitch as NonNullable<BlockPayload["pitch"]>),
    price: "$50",
    lines: [
      { kind: "text", text: "Put your ad here" },
      { kind: "price", text: "$50 a week" },
      { kind: "proof", text: "Seen 1,240 times in the last 30 days" },
    ],
    spark: [0, 5, 9, 4, 12, 20, 8],
  },
};

describe("a composed empty state", () => {
  it("sets each line the owner stacked", async () => {
    answerWith(billboard);

    const html = await markup({ url: embedUrl });

    expect(html).toContain('class="promoot-line promoot-line-text">Put your ad here<');
    expect(html).toContain('class="promoot-line promoot-line-price">$50 a week<');
    expect(html).toContain("promoot-line-proof");
  });

  it("leaves the classic pitch behind when it does", async () => {
    answerWith(billboard);

    const html = await markup({ url: embedUrl });

    expect(html).toContain('class="promoot-bb"');
    expect(html).not.toContain('class="promoot-cta"');
    expect(html).not.toContain("Sponsor this spot for $50");
  });

  it("draws the sparkline behind the lines", async () => {
    answerWith(billboard);

    const html = await markup({ url: embedUrl });

    expect(html).toContain('class="promoot-spark"');
    expect(html).toContain("<polyline");
    expect(html).toContain('points="0,48 ');
  });

  it("leaves the sparkline out when the slot has no traffic to show", async () => {
    answerWith({
      ...billboard,
      pitch: { ...billboard.pitch, spark: null } as BlockPayload["pitch"],
    });

    const html = await markup({ url: embedUrl });

    expect(html).not.toContain("promoot-spark");
    expect(html).toContain("Put your ad here");
  });

  it("offers the visitor a preview of their own ad on hover", async () => {
    answerWith(billboard);

    const html = await markup({ url: embedUrl });

    expect(html).toContain("Your product · one line your buyers read");
    expect(html).toContain("This is how it would look. $50.");
  });

  it("drops the price from the preview when the server sends none", async () => {
    answerWith({
      ...billboard,
      pitch: { ...billboard.pitch, price: undefined } as BlockPayload["pitch"],
    });

    const html = await markup({ url: embedUrl });

    expect(html).toContain("This is how it would look.");
    expect(html).not.toContain("This is how it would look. $");
  });

  it("still sells the slot through the purchase link", async () => {
    answerWith(billboard);

    expect(await markup({ url: embedUrl })).toContain(
      'href="https://promootlabs.com/s/slot_1"'
    );
  });
});

// A host on an older Promoot deployment gets a payload with none of these
// fields, and must keep rendering exactly what it rendered before.
describe("a server that sends no composed lines", () => {
  it("keeps the classic pitch", async () => {
    answerWith(payload);

    const html = await markup({ url: embedUrl });

    expect(html).toContain('class="promoot-cta"');
    expect(html).not.toContain('class="promoot-bb"');
  });

  it("keeps the classic pitch for an empty stack too", async () => {
    answerWith({
      ...billboard,
      pitch: { ...billboard.pitch, lines: [] } as BlockPayload["pitch"],
    });

    expect(await markup({ url: embedUrl })).toContain('class="promoot-cta"');
  });
});

// The owner's Match-your-site controls arrive as custom properties on the
// block's own scope; every frame has to actually read them.
describe("the look the owner chose", () => {
  const dressed = {
    ...payload,
    paletteVars:
      "--surface: #fff; --edge: #ccc; --ink: #000; --muted: #666; --font: Georgia, serif; --radius: 3px; --border: 0px",
  };

  it("declares what the server sent on its own scope", async () => {
    answerWith(dressed);
    const css = await stylesheet();

    expect(css).toContain("--font: Georgia, serif");
    expect(css).toContain("--radius: 3px");
    expect(css).toContain("--border: 0px");
  });

  it("draws every frame from those values rather than its own", async () => {
    answerWith(dressed);
    const css = await stylesheet();

    for (const frame of [".promoot-text {", ".promoot-cta {", ".promoot-bb {"]) {
      const rule = css.slice(css.indexOf(frame), css.indexOf("}", css.indexOf(frame)));

      expect(rule).toContain("var(--border, 1px)");
      expect(rule).toContain("var(--radius, 10px)");
      expect(rule).toContain("var(--font, inherit)");
    }
  });

  // A block on an older Promoot server is sent no --border at all. Without a
  // literal fallback the whole shorthand is invalid at computed-value time and
  // the frame silently loses its outline.
  it("keeps a literal fallback on every look value", async () => {
    answerWith(payload);
    const css = await stylesheet();

    expect(css).not.toContain("var(--border)");
    expect(css).not.toContain("var(--radius)");
    expect(css).not.toContain("var(--font)");
  });

  it("takes the host's own typeface when the owner never picked one", async () => {
    answerWith(payload);

    expect(await stylesheet()).toContain("var(--font, inherit)");
  });
});

describe("when there is nothing to show", () => {
  it("renders the fallback for a paused slot", async () => {
    answerWith({ ...payload, render: "blank", pitch: null });

    expect(await render({ url: embedUrl, fallback: <p>nothing here</p> })).toBe(
      "<p>nothing here</p>"
    );
  });

  it("renders the fallback when the server refuses", async () => {
    answerWith(null, false);

    expect(await render({ url: embedUrl, fallback: <p>offline</p> })).toBe(
      "<p>offline</p>"
    );
  });

  it("renders nothing at all when no fallback was given", async () => {
    answerWith(null, false);

    expect(await render({ url: embedUrl })).toBe("");
  });
});
