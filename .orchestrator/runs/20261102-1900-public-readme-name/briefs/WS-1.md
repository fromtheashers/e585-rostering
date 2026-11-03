RUN: 20261102-1900-public-readme-name
WORKSTREAM: WS-1: Public README

OBJECTIVE
The repo will be public. Rewrite README.md so a stranger who forks it can deploy and use the app, with no private details of the current owner's setup and no mention of Render.

TASK
Rewrite /home/claude/e585-rostering/README.md in full. Also remove Render mentions from the comments in .env.example and .dev.vars.example (keep the variable lines as they are).

CONTEXT
- App: Next.js on Cloudflare Workers via @opennextjs/cloudflare, Postgres on Neon reached through Cloudflare Hyperdrive (caching OFF). Read wrangler.jsonc, package.json scripts, .env.example, .dev.vars.example to get commands and names right.
- The app titles itself "<group name> Rostering" from the group name typed at Setup (editable in More > Settings). README heading: "# Small Group Rostering", then one line saying the app takes its title from your group's name.
- Remove completely: Render (every mention, the "old way" section, copying SESSION_SECRET from Render, switching Render off, onrender links, sleeping-on-free-plan comparisons), the GitHub account "fromtheashers", the Worker name "cgroster", the Hyperdrive name "e585-neon", "E585"/"e585" anywhere, "asher", the Hyperdrive ID, "PIN moved to a stronger lock" notes, "A group set up before personal PINs / Become the owner" note, "Move the group over" section, and any "keeps using your Neon database / your people stay as they are" migration framing.
- New deploy flow for a fresh install, as numbered sections, each with every click listed (keep the current README's level of detail; the owner wants step-by-step instructions listing every user action):
  1. Fork the repository on GitHub (Fork button, choose your account, Create fork).
  2. Create a Neon project (sign up, create project, pick a region near your group) and copy the DIRECT connection string (pooling off), with the reason.
  3. Create a Cloudflare account.
  4. Create the Hyperdrive configuration (any name, e.g. `roster-db`), caching OFF with the reason, copy its ID.
  5. In your fork, edit wrangler.jsonc: set `"name"` to your Worker name (lowercase letters, numbers, dashes) and replace the Hyperdrive `"id"` value with yours. The file currently contains the original author's values, so say "replace the existing value" (do not quote those values). Keep the `localConnectionString` placeholder line.
  6. Connect the repo in Workers & Pages: project name must match `name` in wrangler.jsonc; build command `npm run cf:build`; deploy command `npx wrangler deploy`; path `/`; build variable DATABASE_URL = Neon string; production branch main. Keep the troubleshooting tip for "DATABASE_URL is not set".
  7. Add SESSION_SECRET as a runtime Secret (Settings > Variables and Secrets, Type Secret), with how to make a random value (e.g. a password manager's generator, at least 32 characters), and that it must not be a Build variable.
  8. Branch control: turn off builds for non-production branches.
  9. Open the .workers.dev address; you see "Set up your group's roster"; fill in group name, usual start time, your name, PIN; you are owner.
  Then: add people, mark meeting Fridays, share the group link (More). 
- Keep and update: "What it does" list (note: members don't take roles themselves; they offer per Friday with "I can do it" and an admin puts them on; admins can assign or press "Suggest people for open slots"; admins can change one Friday's time; anyone can view the read-only roster at the bare address; people with a PIN can sign in at /sign-in), "Good to know" (group link leak, owner/admin powers, new phone sign-in, forgot PIN, owner forgot PIN: someone with database access), "Limits and cost", "Run it locally", "Run the Workers version on your computer" (use a neutral database name like `roster` in example strings), "Checks".
- Plain, friendly British English, short sentences, no em-dashes.

INPUTS
README.md, wrangler.jsonc, package.json, .env.example, .dev.vars.example, src/app/setup/page.tsx, src/app/g/[token]/more/page.tsx (labels).

SCOPE
Writable: README.md, .env.example, .dev.vars.example
Read-only: everything else
Permitted special actions: none

OUTPUT
The rewritten files in place.

ACCEPTANCE CRITERIA
1. `grep -niE "render|onrender|fromtheashers|cgroster|e585|asher|29ac8849" README.md .env.example .dev.vars.example` returns nothing.
2. Deploy section covers fork, Neon direct string, Hyperdrive caching off, wrangler.jsonc name + ID, connect repo with build/deploy commands, DATABASE_URL build variable, SESSION_SECRET runtime secret, branch control, first visit to setup.
3. Every step lists exact clicks.
4. Keeps what it does, good to know, limits and cost, run locally, Workers preview, checks.

VERIFICATION
Run the grep in criterion 1 (pass = no output). Check every internal link anchor (#...) matches a heading.

STOP CONDITIONS
Stop and report BLOCKED if a needed fact (a command or setting) cannot be found in the repo files.
