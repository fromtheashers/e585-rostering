import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: every page is force-dynamic, so there is nothing to store between requests.
export default defineCloudflareConfig();
