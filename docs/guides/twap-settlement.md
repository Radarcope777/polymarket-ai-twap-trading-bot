# TWAP Settlement: Oracle TWAP vs Bot TWAP Execution

Polymarket crypto Up/Down markets resolve on **Chainlink TWAP**, not a single terminal price tick. This bot implements two distinct TWAP concepts:

## Oracle TWAP (Settlement)

- Source: RTDS topic `prices.crypto.chainlink.twap`
- Window: 30 seconds (5-minute contracts) or 60 seconds (15-minute and 4-hour contracts)
- The bot **forecasts projected final TWAP** within the resolution window
- Trading near expiry uses projected TWAP, not spot price alone

## Bot TWAP Execution (Order Slicing)

- The execution engine splits target notional into N child orders over T seconds
- Randomized slice timing reduces predictability
- Prefers post-only maker limits when edge is small
- Uses FOK/FAK only when urgency + edge exceed threshold

## Staleness Detection

Samples older than the configured threshold (default 2s) are rejected. The bot pauses trading on stale oracle feeds and auto-reconnects RTDS with exponential backoff.

## Audit Trail

All raw TWAP samples are stored for post-trade audit via `GET /api/audit/twap-samples`.
