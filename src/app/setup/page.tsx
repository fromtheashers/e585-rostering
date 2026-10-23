import { redirect } from "next/navigation";
import { firstGroup } from "@/lib/data";
import { createGroup } from "@/lib/actions";
import { Mark } from "@/components/ui";
import { StateForm, SubmitButton, TimezoneInput } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up" };

export default async function Setup() {
  if (await firstGroup()) redirect("/");
  return (
    <main className="shell page" style={{ maxWidth: 560 }}>
      <Mark size={40} />
      <div>
        <h1 className="greeting">Set up your group&rsquo;s roster.</h1>
        <p className="lede">
          This takes a minute. You&rsquo;ll be the organiser. Next you&rsquo;ll add everyone&rsquo;s names, then share
          one link in the group chat.
        </p>
      </div>
      <StateForm action={createGroup} className="panel stack-lg">
        <div className="field">
          <label htmlFor="name">Group name</label>
          <input className="input" id="name" name="name" defaultValue="E585" required maxLength={60} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="startTime">Usual start time on Fridays</label>
          <input className="input" id="startTime" name="startTime" type="time" defaultValue="19:30" required />
        </div>
        <div className="field">
          <label htmlFor="pin">Organiser PIN</label>
          <span className="hint">4 to 6 digits. You&rsquo;ll use it to edit people, roles and the roster.</span>
          <input
            className="input pin"
            id="pin"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            required
            autoComplete="new-password"
          />
        </div>
        <p className="small muted">
          The five roles are added for you: Praise, Worship, Play Guitar, SongSheets and Games (optional). You can
          change them later.
        </p>
        <TimezoneInput />
        <SubmitButton className="btn primary block" pending="Setting up…">
          Create the roster
        </SubmitButton>
      </StateForm>
    </main>
  );
}
