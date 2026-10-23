import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { organiserContext } from "@/lib/guard";
import { changePin, newLink, updateSettings } from "@/lib/actions";
import { Hidden } from "@/components/ui";
import { ConfirmButton, CopyButton, StateForm, SubmitButton, Toast } from "@/components/client";

export const metadata = { title: "Settings" };

const ZONES = [
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Manila",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export default async function Settings({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ newlink?: string }>;
}) {
  const { token } = await params;
  const { newlink } = await searchParams;
  const { group } = await organiserContext(token, "/organiser/settings");
  const base = `/g/${token}`;
  const host = (await headers()).get("host") ?? "";
  const link = `${host.startsWith("localhost") ? "http" : "https"}://${host}${base}`;
  const zones = ZONES.includes(group.timezone) ? ZONES : [group.timezone, ...ZONES];

  return (
    <main className="shell page" style={{ maxWidth: 760 }}>
      <Link href={`${base}/more`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> More
      </Link>
      <h1 className="greeting">Settings</h1>
      {newlink ? <Toast message="New link made. Share it in the group chat." /> : null}

      <StateForm action={updateSettings} className="panel stack">
        <Hidden values={{ token }} />
        <div className="field">
          <label htmlFor="name">Group name</label>
          <input className="input" id="name" name="name" defaultValue={group.name} maxLength={60} required />
        </div>
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="startTime">Usual start time</label>
            <input className="input" id="startTime" name="startTime" type="time" defaultValue={group.startTime} required />
          </div>
          <div className="field">
            <label htmlFor="timezone">Time zone</label>
            <select className="select" id="timezone" name="timezone" defaultValue={group.timezone}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <SubmitButton className="btn sm primary" pending="Saving…">
            Save
          </SubmitButton>
        </div>
      </StateForm>

      <section className="panel stack" aria-labelledby="link-h">
        <h2 id="link-h" style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>
          Group link
        </h2>
        <p className="small muted">Anyone with this link can open the roster. If it ends up somewhere it shouldn&rsquo;t, make a new one: the old link stops working straight away.</p>
        <pre className="copybox">{link}</pre>
        <div className="actions">
          <CopyButton text={link} label="Copy link" className="btn sm primary" />
          <form action={newLink}>
            <Hidden values={{ token }} />
            <ConfirmButton question="Everyone will need the new link." confirm="Make new link">
              Make a new link
            </ConfirmButton>
          </form>
        </div>
      </section>

      <StateForm action={changePin} className="panel stack" resetOnOk>
        <Hidden values={{ token }} />
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>Organiser PIN</h2>
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="pin">New PIN</label>
            <input className="input" id="pin" name="pin" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirm">Type it again</label>
            <input className="input" id="confirm" name="confirm" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="new-password" />
          </div>
        </div>
        <div>
          <SubmitButton className="btn sm" pending="Changing…">
            Change PIN
          </SubmitButton>
        </div>
      </StateForm>
    </main>
  );
}
