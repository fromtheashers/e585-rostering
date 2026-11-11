# UI/UX audit — 12 November 2026

Scope: public roster, meeting details, calendar, sign-in, member Home/Me/More, and organiser people, roles, roster and settings. Refinement of the existing stained-glass design, using PRODUCT.md and the repository's Impeccable audit/craft guidance. All browser work used a local Postgres database and explicitly labelled sample people and songs.

## Findings and implementation

| Priority | Finding and user impact | Implemented improvement |
| --- | --- | --- |
| P1 | Filled roster links override their native link role with `listitem`, making them harder to find using assistive technology's link navigation. | Native `ul`/`li` roster structure, with real links inside each list item. Optimistic states retain the same list item. |
| P1 | No way to bypass repeated navigation using the keyboard. Sticky navigation can cover fragment targets. | A visible-on-focus “Skip to content” link and focusable main landmark on every page, including loading, not-found and error views; scroll padding accounts for the sticky header. |
| P2 | A desktop viewport forces five panes even in the narrow column beside Later Fridays. This squeezes role names, badges and actions. | Container queries use two columns in narrow roster containers and a single row when the container has at least 700px. Existing phone layout and full-width optional final pane remain. |
| P2 | Failed-save feedback disappears after 2.8 seconds; long toast text has no explicit phone-width limit. | Failed-save messages persist until dismissed, with a 44px-tall Dismiss button and a width bounded by the viewport. Ordinary success messages still clear automatically. |
| P2 | Opening a destructive confirmation removes the focused trigger, without moving focus or providing Escape cancellation. The generic “Keep” label is unclear for actions such as resetting a PIN. | Focus moves to Cancel, Escape cancels, and cancellation returns focus to the initiating button. Shared controls consistently say Cancel. |
| P2 | Removing songs or releasing a song slot submits immediately. | Added explicit confirmation for song removal, open-slot removal and releasing a song to another leader. |
| P2 | Unexpected rendering errors have no product-specific recovery page. | A shared error boundary offers Try again and Back to home with a short recovery explanation. |
| P2 | Long names and headings can exceed their columns; a long group name competes with navigation on small screens. | Wrap long headings and row content, allow grid children to shrink, protect navigation and the group mark from shrinking, and reduce header spacing below 360px. |

## Verification

- Chromium/Playwright with local sample data: nine member/organiser routes at 320, 375, 760, 1024 and 1440px, in light and dark themes. No page-level horizontal overflow detected.
- Keyboard interaction: skip link focuses main; song removal opens a confirmation and focuses Cancel; Escape closes it, restores the trigger's focus and leaves the song untouched.
- Simulated failed server action: optimistic state rolls back, error remains after the former timeout, fits a 375px viewport and dismisses on request.
- Long custom role text and the You badge remain within their pane in both themes with reduced motion enabled. Filled panes are discoverable as links.
- Public Home, Calendar, meeting details, name picker, PIN and not-found pages checked at 320px; long group name checked against navigation.
- TypeScript passed; all 16 existing unit tests passed; the optimized Next.js production build passed. Browser interaction and responsive checks were repeated against the production server.

## Review and limits

The original jewel palette, self-hosted typography, roster-first hierarchy, light/dark tokens and one-tap role actions are retained. No dependencies, schema, identity or permission changes are needed. Manual finish review passed for the implemented fixes after inspecting rendered mobile and desktop layouts and exercising keyboard/error interactions.

The Impeccable context launcher could not create its engine cache under the read-only home directory; project context and guidance were read directly. Its automated detector did not run, so this is not a complete WCAG certification or performance benchmark. Browser checks use Chromium emulation, not physical iOS devices or a screen reader. The organiser grid still intentionally scrolls horizontally inside its own frame on phones. Calendar subscriptions and reminders remain outside this pass.
