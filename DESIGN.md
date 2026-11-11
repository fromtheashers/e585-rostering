# E585 Rostering interface

The roster is a stained-glass window: a member's jewel colour fills an assigned role; open panes invite someone to serve. This is a phone-first task interface for a small group, preserving the direction in PRODUCT.md and `.impeccable/surfaces/src-app.md`.

## Visual system

- Instrument Serif for greetings; Instrument Sans for controls and content. Both are self-hosted through the existing font packages.
- Colours, spacing, radii and type sizes live in `src/app/globals.css`. Light pages use white and stone panels; dark pages use charcoal surfaces. Follow the existing semantic tokens for text, muted content, positive/negative feedback and focus.
- Person colours come from `JEWELS` in `src/lib/palette.ts`. Colour is accompanied by visible names and role labels.
- A centred shell is at most 1040px wide. Home adds a Later Fridays sidebar from 960px; mobile has a fixed bottom tab bar, while desktop has inline navigation.
- Roster layouts respond to their own container, not the screen: two columns below 700px, one row above it. In the two-column layout an odd final pane spans both columns. Labels wrap and the You badge retains its shape.

## Interaction and accessibility

- Preserve native links, buttons, lists, labels and form controls. A roster is a labelled native list containing links or open-role actions.
- Touch targets are at least 44px, including the existing extended target areas for small controls.
- Every page has a focusable main target for Skip to content. Fragment scrolling leaves room for the sticky header.
- Destructive confirmations are inline, focus Cancel when opened, support Escape and restore the initiating control on cancellation.
- Actions update optimistically and roll back on failure. Failed-save feedback remains until dismissed; ordinary confirmations may expire. Toasts must fit narrow phones.
- Unexpected page errors offer a retry and a path home. Error text explains a recovery step without exposing implementation details.
- Respect reduced motion, visible keyboard focus and both system colour themes. Use long sample names and labels when checking layout changes.

## Current verification

See `docs/ui-ux-audit-2026-11-12.md` for findings, implemented improvements, checks and limits. Existing raster icons are retained; no new images were produced for this pass.
