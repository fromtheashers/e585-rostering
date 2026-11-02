# Small Group Rostering

The app takes its title from your group's name, for example "Friday Group Rostering".

A small roster for a weekly small group of up to ten people. No accounts: everyone opens one secret group link, picks their name and makes their own PIN. The person who sets it up is the owner, and the owner can make other people admins.

What it does:

- An admin marks which Fridays have a meeting on a shared calendar.
- People mark which Fridays they can make and which roles they love, are fine with, or would rather not do.
- Members don't take roles themselves. For each Friday they offer with **I can do it**, and an admin puts them on.
- Admins can assign people by hand, or press **Suggest people for open slots** and confirm the suggestions.
- Admins can change the start time of a single Friday.
- Praise and Worship leaders add songs (title, artist, key). Open song slots let more people lead a song.
- Anyone can view the read-only roster at the bare address of the app. People who have a PIN can sign in at `/sign-in`.
- The roster can be copied as text for the group chat.

## Deploy to Cloudflare Workers

The app runs on Cloudflare Workers with a Postgres database on Neon. A Worker never sleeps, so the first visit of the day opens straight away.

You need about 30 minutes and a GitHub login. You don't need to install anything. Every step below lists each click.

### 1. Fork the repository

1. Sign in at https://github.com (or create a free account).
2. Open this repository's page on GitHub.
3. Click **Fork** (top right).
4. Under **Owner**, choose your own account. Leave the name as it is, or pick another one.
5. Click **Create fork**. You are now on your own copy. Every later step uses your fork.

### 2. Create a Neon project and copy a direct connection string

Cloudflare's database helper, Hyperdrive, keeps its own pool of connections, so it wants Neon's **direct** address, not the pooled one.

1. Go to https://console.neon.tech and click **Sign up**. Use your email, Google or GitHub.
2. Click **Create project** (or **New project**).
3. Type a project name, for example `roster`.
4. Pick a **Region** near your group. A close region makes the app feel quicker.
5. Click **Create**.
6. On the project dashboard, click **Connect** (top right).
7. Leave **Branch** as `main` and **Database** as `neondb`.
8. Switch **Connection pooling** **off**. The address in the box changes: the part after the `@` no longer has `-pooler` in it.
9. Click **Show password** if the password is hidden, then click **Copy snippet**. It looks like `postgresql://neondb_owner:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
10. Keep it somewhere private for steps 4 and 6. Don't paste it into the code or a chat.

### 3. Create a Cloudflare account

1. Go to https://dash.cloudflare.com/sign-up.
2. Type your email address and a password, then click **Sign up**.
3. Open the email from Cloudflare and click the link in it to verify your address.
4. If Cloudflare asks what you want to do first, click **Skip** (or close the dialog). You land on the account home page.

The free plan is enough. See [Limits and cost](#limits-and-cost) below.

### 4. Create the Hyperdrive configuration

Hyperdrive is how the Worker reaches Neon quickly.

1. Open https://dash.cloudflare.com/?to=/:account/workers/hyperdrive. (Or, in the left sidebar, open **Storage & databases** and click **Hyperdrive**. On some accounts it sits under **Workers & Pages**.)
2. Click **Create configuration** (if this is your first one, the button is in the middle of the page).
3. **Name:** type any name you like, for example `roster-db`.
4. **Connection string:** paste the Neon string from step 2. If the form shows separate boxes instead (host, port, database, user, password), click the **Connection string** tab above them first.
5. **Caching:** switch it **off** (untick **Enable caching**, or pick **Disabled**). With caching on, Hyperdrive can hand back a saved copy of a query for up to a minute, so someone could offer for a Friday and still see it unchanged, or see an old roster.
6. Click **Create**. Cloudflare checks it can reach Neon; this takes a few seconds.
7. On the configuration's page, find **ID** (a long string of letters and numbers) and click the copy icon next to it.
8. Check caching is off: click the **Settings** tab and look at **Caching**. If it says enabled, click **Edit** (or the toggle), turn it off, and click **Save**.

### 5. Put your Worker name and Hyperdrive ID into the code

The file `wrangler.jsonc` tells Cloudflare what to call your Worker and which database helper to use. It currently holds the original author's values, so you replace two of them.

1. Open your fork on GitHub and make sure the branch picker (top left of the file list) says `main`.
2. Click the file `wrangler.jsonc`.
3. Click the pencil icon (**Edit this file**), top right of the file.
4. Find the line that starts `"name":`. Replace the existing value (keep the quotes) with a name of your own: lowercase letters, numbers and dashes only, for example `my-group-roster`. Remember it for step 6.
5. Find the line that starts `"id":` inside the `hyperdrive` section. Replace the existing value (keep the quotes) with the ID you copied in step 4.
6. Leave the `localConnectionString` line exactly as it is. It is a placeholder, and Cloudflare's deploy step crashes without it.
7. Click **Commit changes...** (top right). Leave **Commit directly to the `main` branch** selected and click **Commit changes**.

The ID isn't a secret: on its own it can't reach your database.

### 6. Connect the repository to Cloudflare

1. Open https://dash.cloudflare.com and, in the left sidebar, click **Workers & Pages** (under **Compute**).
2. Click **Create application** (top right).
3. Under **Import a repository**, click **Connect GitHub** (or **Continue with GitHub**).
4. GitHub opens. Pick your own account, choose **Only select repositories**, pick your fork, and click **Install & Authorize** (GitHub may ask for your password). You come back to Cloudflare.
5. Click your fork in the repository list.
6. Fill in the **Set up your application** page:
   - **Project name:** the same name you put in `wrangler.jsonc` in step 5. It must match the `name` there, or the build fails.
   - **Build command:** `npm run cf:build` (it updates the database tables, then builds the app).
   - **Deploy command:** `npx wrangler deploy` (it hands over to OpenNext's deploy, which needs the placeholder `localConnectionString` already in `wrangler.jsonc`).
   - **Path** (root directory): leave it as `/`.
7. Click **Advanced settings** (below the commands), then under **Build variables** click **Add variable**:
   - **Variable name:** `DATABASE_URL`
   - **Value:** the Neon string from step 2.
   - Tick **Encrypt** if it's offered.
8. Make sure the production branch is `main` (it's shown on this page, or under **Settings**, **Build** later), then click **Create and deploy** (or **Deploy**).
9. Wait for the build log to finish with a green **Success** (5 minutes or so the first time). If it fails at `db:migrate` saying `DATABASE_URL is not set`, go to the Worker's **Settings**, **Build**, **Variables and secrets**, add `DATABASE_URL` there, then open **Deployments** and click **Retry build**.

`DATABASE_URL` is only used while building, to create or update the Neon tables. The running Worker reaches Neon through Hyperdrive, so you don't add `DATABASE_URL` as a runtime variable.

### 7. Add SESSION_SECRET to the Worker

`SESSION_SECRET` is a long random text that signs the "signed in as" cookie. Make one yourself: use your password manager's password generator, set it to at least 32 characters, and copy the result. Keep it private.

1. In **Workers & Pages**, click your Worker's name.
2. Click the **Settings** tab, then **Variables and Secrets**.
3. Click **Add**.
4. **Type:** **Secret**. **Variable name:** `SESSION_SECRET`. **Value:** paste your random text.
5. Click **Deploy** (or **Save and deploy**). This restarts the Worker with the secret.

It must be a runtime Secret here. Do not add it as a Build variable.

### 8. Stop test branches from touching the real database

The build command updates the real Neon tables, so only `main` should build.

1. Still in the Worker's **Settings**, click **Build**.
2. Under **Branch control**, untick **Builds for non-production branches** (or set it to **None**), then click **Save**.

### 9. Open the app and set up your group

1. Click the **Overview** tab (or **Deployments**). Under **Domains** (or **Visit**), click the address ending in `.workers.dev`, for example `https://my-group-roster.your-name.workers.dev`.
2. You land on **Set up your group's roster**. Fill in:
   - **Group name:** this becomes the app's title, "<group name> Rostering". You can change it later under **More**, **Settings**.
   - **Usual start time on Fridays**
   - **Your name**
   - **Your PIN:** 4 to 6 digits.
3. Click **Create the roster**. You are now the owner.
4. On **People**, type each person's name and click **Add**. Everyone gets a colour.
5. Click **Add meeting Fridays** and tap each Friday you meet.
6. Go to **More**, click **Copy group link**, and send it to the group chat.

Each person opens the link, taps their name and makes their own PIN. Once a name has a PIN, it leaves the pick list, so nobody else can choose it. Then they mark their Fridays and preferences under **Me**.

### Good to know

- Anyone with the group link can open the roster. If it leaks, go to **More**, **Settings**, **Make a new link**. The old link stops working straight away.
- **Owner and admins:** admins can do everything the owner can, except remove the owner or reset the owner's PIN. To make someone an admin, go to **More**, **People**, tap **Edit** under their name, then tap **Make admin**. **Remove as admin** in the same place takes it away.
- **Signing in on a new phone:** on **Who are you?**, tap your name under **Already made your PIN?** and enter your PIN.
- **Forgot a PIN:** the owner or an admin goes to **More**, **People**, taps **Edit** under that person's name, then **Reset PIN**. That person picks their name again and makes a new PIN. To change your own PIN, go to **Me**, **Change my PIN**.
- **Owner forgot their PIN:** nobody in the app can reset it. Ask someone with access to the Neon database for help rather than deleting anything.

### Limits and cost

- Workers Free covers 100,000 requests a day, far more than a group of ten uses.
- Free Workers get 10 ms of CPU time per request (time spent waiting for the database doesn't count). Checking a PIN takes roughly 20 ms, which a Worker is allowed to go over now and then. If anyone sees **Worker exceeded resource limits** (error 1102) when signing in, upgrade: in **Workers & Pages**, click **Plans** (or **Upgrade**), pick **Workers Paid** (US$5 a month) and add a card. It raises the limit to 30 seconds.
- Size: Free Workers were long capped at 3 MiB compressed; Cloudflare's limits page now lists 64 MiB uncompressed on both plans. This app's Worker is about 1.1 MiB compressed (5.3 MiB uncompressed), so it fits either way. The build log shows the current numbers on the `Total Upload: ... / gzip: ...` line.
- Hyperdrive is included on the free plan.
- Neon's free plan is enough for a group this size.

## Run it locally

1. Install Node 20 or newer and a Postgres database (or use a Neon branch).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `SESSION_SECRET`.
3. Run `npm install`.
4. Run `node --env-file=.env scripts/migrate.mjs` to create the tables.
5. Run `npm run dev` and open http://localhost:3000.

### Run the Workers version on your computer

`npm run dev` runs the app in Node. To try it in the real Workers runtime:

1. Have a local Postgres database with a password, with the tables created (`node --env-file=.env scripts/migrate.mjs` with `DATABASE_URL` pointing at it).
2. Copy `.dev.vars.example` to `.dev.vars` and set `SESSION_SECRET`. `.dev.vars` holds the Worker's secrets on your computer and is never committed.
3. In `.env` (or your shell), set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to that database, for example `postgresql://postgres:password@127.0.0.1:5432/roster`. The local Hyperdrive binding connects there. It is kept out of `wrangler.jsonc` so no connection string is committed.
4. Run `npm run preview` and open http://localhost:8787.

After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` to refresh `cloudflare-env.d.ts`.

### Checks

Run `npm run typecheck` and `npm test`.
