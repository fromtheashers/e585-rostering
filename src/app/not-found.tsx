import { Mark } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="shell page" style={{ maxWidth: 520 }}>
      <Mark size={40} />
      <h1 className="greeting">This link doesn&rsquo;t open anything.</h1>
      <p className="lede">
        The organiser may have made a new link. Ask in the group chat for the latest one.
      </p>
    </main>
  );
}
