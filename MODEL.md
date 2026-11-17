# Token Radar — make.fun token-radar-01

A token launch radar: it reads a frozen DefiLlama snapshot of 758 protocols, ranks every
pre-token protocol that could still launch one by implied value, and shows the board as a
static dashboard. Entry for the make.fun bounty **token-radar-01** (best token launch radar,
$1,325, closes 2026-12-14T10:00:00Z). Node 22, standard library only, no network at runtime.

## What it does

- Reads `/input/snapshot.json` (or `--input <snapshot.json|directory>`).
- Scores every rankable pre-token protocol and writes `/output/board.json` (the ranked board),
  `/output/data.js` (the dashboard's dataset), the `dashboard/` page, `screenshots/`, and
  `/output/dossier.json` (the summary the judge reads, built with the kit's vendored library).
- Outside the grader's container, `MAKEFUN_OUTPUT_DIR` stands in for `/output`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

## How it scores — model radar-2

```
implied value = TVL × category multiple × growth multiplier × maturity multiplier
```

- **Category multiple.** The median market-cap-to-TVL ratio of the token-bearing protocols in
  the same category in this same snapshot (at least 3 of them), else the median over every
  token-bearing protocol (0.20). Clamped to 0.05–1.00, so no token is ever worth more than the
  value it secures. The starter's flat 0.25 for every protocol is replaced by what the snapshot's
  own market says: Dexs 0.34, Lending 0.13, Liquid Staking 0.04, RWA 0.28, Yield 0.18,
  Bridge 0.56, Basis Trading 0.65, Risk Curators 0.21. No name is ever special-cased.
- **Growth.** The seven-day TVL change, clamped to −60%..+120%, moves the value by half its
  size: +20% in a week scores ×1.10, −20% scores ×0.90. A missing change counts as 0%.
- **Maturity.** How long the protocol has run with no token: 0.50 for a brand-new listing,
  rising to 1.20 after four years. Unknown listing date counts as one year.
- **Coverage.** The board ranks **203** protocols: the watchlist's 40 plus 163 below the floor —
  every rankable pre-token protocol in the snapshot, at any TVL. Rankable means the record shows
  no token, and the category is a launchable one: not an exchange, a bridge, a liquid-staking or
  restaking product, or a name ending in a version marker. A wrapped, staked or bridged product
  of a token that already trades is not a launch waiting to happen. Live-token protocols (24, by
  market cap) are kept apart on the dashboard's Live tab and shown at the market's own value.
- **Farm plans.** Each row carries 7 steps built from its own record — category, chains, TVL
  tier, age — with concrete capital ($50–$250 by TVL), gas costs and holding times, never slogans.

Top of the board on the kit snapshot (2026-11-14): Steakhouse Financial $442.8M, Sentora
Curator $414.7M, Gauntlet $263.7M, Veda $257.3M, USDD $139.3M. The dashboard is sortable and
filterable (search, category, chain, minimum TVL, watchlist-only), with a detail view per
protocol showing the full model breakdown and its farm plan.

## Test results vs the starter baseline

Run on the kit's `input/snapshot.json` (758 protocols, 40 on the watchlist):

| | starter | radar-2 (this entry) |
|---|---|---|
| rows ranked | 200 (40 watchlist + 160 below the $50M floor) | 203 (40 watchlist + 163, every rankable protocol at any TVL) |
| top 5 | Steakhouse $543.6M, Gauntlet $323.8M, Veda $311.3M, USDD $214.2M, Upshift $111.7M | Steakhouse $442.8M, Sentora Curator $414.7M, Gauntlet $263.7M, Veda $257.3M, USDD $139.3M |
| wrapped/bridged/staked products on the board | yes (small Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking rows) | none |
| farm steps per row | 6 | 7 |
| implied-value range | $543.6M → $1.1M | $442.8M → $0.5M |

The starter misses the big non-watchlist protocols entirely (its early set is sub-floor only):
Sentora Curator ($2.76B TVL, #2 here), BitFi Basis (#6), Polymarket International (#8) are not
ranked by the starter at all.

Gate checks, all run locally and passing: board covers all 40 watchlist slugs; ranks 1..203;
implied value non-increasing; every farm plan 7 steps of 20–600 characters; dashboard source
20,181 bytes (cap 65,536); 3 screenshots, each under 512KB; `dossier.json` rebuilds
byte-for-byte from the same `/output`. Screenshots were taken at 1440×900 with the stock
Puppeteer Chrome 131 in this VM (the Meta-patched Chromium refuses to start here: "Hatch WebGL
domain policy is required for browser startup").

## What the kit does not provide

- **No local grader.** `makefun grade-local` refuses this competition: it is a program/v1
  competition whose scorer and reference data are not published in the kit; the house grades it
  from its own competition directory. There is no numeric score to report against the baseline —
  only the board comparisons above and the gate checks in `lib/model.ts` (`boardIssue`).
- **The scoring metric is the house's sealed tests**, not a public formula: the competition
  grades the entry on its practice instance with the sealed scorer. This entry is built to the
  rules the kit does publish (watchlist coverage, separation of live tokens, farm-step shape,
  dossier byte-match).
- **"Records no token" is a statement about the snapshot, not the world.** A protocol on this
  board may still have a token its record does not carry. USDD and Bittensor dTAO sit on the
  board because the house's own watchlist and snapshot record them as pre-token; the radar does
  not second-guess the house's data. Nothing here predicts whether or when a token is issued,
  and implied value is a claim of this radar, not a price.

## Files

```
main.ts                 entrypoint (Node 22, stdlib only)
lib/model.ts            the radar-2 model, board builder, farm plans, gate checks
vendor/makefun-board.ts the kit's vendored dossier library (unchanged)
dashboard/index.html    the board page (static, no network)
dashboard/app.css       dashboard styles
dashboard/app.js        board / live / method tabs, filters, sorting, detail view
screenshots/            board.png, detail.png, filtered.png (1440×900)
LICENSE                 MIT (from the kit)
```

Nothing here submits, signs in, creates a keypair or a repo, or spends money. `out/` is a local
build directory and is not part of the entry.
