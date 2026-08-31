export type BlockRender = "ad" | "pitch" | "blank";

/** An ad is either artwork the sponsor uploaded, or words they wrote. */
export type Creative =
  | { kind: "IMAGE"; title: string; imageUrl: string }
  | {
      kind: "TEXT";
      /** Optional: a link alone is a complete ad, and the host stands in. */
      headline: string | null;
      body: string | null;
      /** Null when the sponsor's site has none, or it could not be captured. */
      faviconUrl: string | null;
      host: string;
      monogram: string;
    };

/**
 * One line of the empty state the slot's owner composed, already resolved into
 * the words it prints. The kind only decides how it is set.
 */
export type PitchLine = {
  kind: "text" | "price" | "proof" | "domain";
  text: string;
};

/** What GET /api/block/:slotId answers with. */
export type BlockPayload = {
  slot: {
    id: string;
    widthPx: number;
    heightPx: number;
    sponsoredLabel: string | null;
  };
  render: BlockRender;
  ad: ({ clickUrl: string; expiresAt: string | null } & Creative) | null;
  pitch: {
    headline: string;
    pitch: string | null;
    proof: string | null;
    terms: string;
    purchaseUrl: string;
    /**
     * The owner's composed empty state. Present from Promoot 0.4 onwards; an
     * older server omits it and the classic pitch is rendered instead.
     */
    lines?: PitchLine[] | null;
    /** Daily views behind the lines, already gated by the owner's traffic floor. */
    spark?: number[] | null;
    /** The price on its own, formatted. */
    price?: string;
  } | null;
  beaconUrl: string;
  paletteVars: string;
};
