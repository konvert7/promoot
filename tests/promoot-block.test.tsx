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

  it("scopes every rule to its own slot", async () => {
    answerWith(payload);
    const html = await render({ url: embedUrl });
    const css = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));

    for (const rule of css.split("\n")) {
      expect(rule.startsWith('[data-promoot-slot="slot_1"]')).toBe(true);
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
