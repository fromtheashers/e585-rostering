---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface: E585 Rostering app (all member and organiser screens)

Mode: Operate. Phone-first web app, opened from a group-chat link. Code-led build.

Audience and job: up to 10 small-group members check the next Friday's roster, take open slots, mark availability and preferences, and add songs; one organiser sets Fridays, people, roles and the roster grid.

Constraints: no logins; standard web controls; 44px touch targets; WCAG AA; reduced motion respected.

Taste-skill app sheet: editorial-greeting (seed 1857603936), adapted: greeting as h1 naming the person and the one fact; tonal panels; one hue budget for the accent.

Unresolved: user may pick a different direction on the decision card (Order of service, Plain modern app, or re-roll).

## Direction contract

THESIS: The roster is a window. Each member has one jewel colour; a filled slot is a pane of that colour, an open slot is clear glass asking to be filled. Refuses the category default of a grey table with amber "unfilled" badges and a teal button.

OWN-WORLD: White page on a cool stone ground (#f4f4f1 family); near-black "lead" ink (#1d1e24) for type and the 2px lines between panes; ten jewel hues (ruby, cobalt, emerald, amber, amethyst, teal, garnet, sapphire, olive, rose) used only as person identity, as pale tints in lists and full panes in the window; clear glass is the white page with a dashed lead outline. Instrument Serif for the greeting, Instrument Sans for everything else, tabular figures.

STORY: Open the link, see "Grace, you're on Praise this Friday", see the window for the next Friday with one clear pane, tap it, take it. Then scroll to songs and the later Fridays.

FIRST VIEWPORT: 56px top bar (group mark and name left, your avatar right). Serif greeting h1 (32px phone) with one grey line of the next meeting date and time. Then the Friday window: a 2px-lead grid of five panes (Praise, Worship, Guitar, SongSheets, Games), each pane the person's colour with role and first name, open panes clear with "Needs someone" and a Take it button. Below: songs card, then upcoming Fridays. Bottom tab bar: Home, Calendar, Me, More.

FORM: candidate 7 of 7 (stained glass window), seed:809752fffba56173.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
