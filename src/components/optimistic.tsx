"use client";

import { createContext, startTransition, useCallback, useContext, useMemo, useOptimistic, useState, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/actions";
import { Toast } from "./client";

/*
 * Taps change the screen straight away and the save happens in the background.
 * A <SaveForm> marks its keys as pending until the server has saved and sent the
 * fresh page; every <Pending> with one of those keys shows its "after" view in the
 * meantime. If the save fails, the pending views fall away and a toast says so.
 */

const FAILED = "That didn't save. Check your connection and try again.";
const NONE: ReadonlySet<string> = new Set();

interface Saver {
  pending: ReadonlySet<string>;
  run: (keys: string[], save: () => Promise<unknown>) => void;
  fail: () => void;
}

const SaverContext = createContext<Saver | null>(null);

/** Next signals a redirect by throwing; it has to keep travelling so the page can move. */
export function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && String((e as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

export function SaveRoot({ children }: { children: ReactNode }) {
  const [pending, markPending] = useOptimistic(NONE, (s, keys: string[]) => new Set([...s, ...keys]));
  const [failures, setFailures] = useState(0);
  const fail = useCallback(() => setFailures((n) => n + 1), []);
  const run = useCallback(
    (keys: string[], save: () => Promise<unknown>) => {
      startTransition(async () => {
        markPending(keys);
        try {
          await save();
        } catch (e) {
          if (isRedirect(e)) throw e;
          fail();
        }
      });
    },
    [markPending, fail],
  );
  const value = useMemo(() => ({ pending, run, fail }), [pending, run, fail]);
  return (
    <SaverContext.Provider value={value}>
      {children}
      {failures ? <Toast key={failures} message={FAILED} /> : null}
    </SaverContext.Provider>
  );
}

const fallback: Saver = {
  pending: NONE,
  run: (_, save) => startTransition(async () => void (await save())),
  fail: () => {},
};

export function useSaver(): Saver {
  return useContext(SaverContext) ?? fallback;
}

export function formData(values: Record<string, string | number>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, String(v));
  return fd;
}

/** A form whose submit returns at once; the matching <Pending> views show the result. */
export function SaveForm({
  action,
  keys,
  children,
  className,
}: {
  action: (form: FormData) => Promise<unknown>;
  keys: string[];
  children: ReactNode;
  className?: string;
}) {
  const { run } = useSaver();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(keys, () => action(fd));
      }}
    >
      {children}
    </form>
  );
}

/** Shows `show` while a save for `on` is in flight, otherwise its children. */
export function Pending({ on, show, children }: { on: string; show: ReactNode; children?: ReactNode }) {
  const { pending } = useSaver();
  return <>{pending.has(on) ? show : children}</>;
}

/* ---------- Songs being added ---------- */

interface Draft {
  id: number;
  title: string;
  artist: string;
  songKey: string;
}

const DraftContext = createContext<{ drafts: Draft[]; add: (d: Draft) => void } | null>(null);

/** Holds the songs typed into one set's "Add song" form until the server has saved them. */
export function SongDrafts({ children }: { children: ReactNode }) {
  const [drafts, add] = useOptimistic<Draft[], Draft>([], (list, d) => [...list, d]);
  const value = useMemo(() => ({ drafts, add }), [drafts, add]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

/** The songs still saving, drawn like the real rows so nothing jumps when they land. */
export function DraftRows() {
  const drafts = useContext(DraftContext)?.drafts ?? [];
  return drafts.map((d) => (
    <div key={d.id} className="song is-draft" aria-busy="true">
      <div className="row-main">
        <span className="song-title">{d.title}</span>
        <span className="song-meta">{[d.artist, "led by you"].filter(Boolean).join(" · ")}</span>
      </div>
      <span className={d.songKey ? "key" : "key muted"}>{d.songKey || "–"}</span>
    </div>
  ));
}

/** Hides "No songs yet" once a draft is showing. */
export function UnlessDrafts({ children }: { children: ReactNode }) {
  const drafts = useContext(DraftContext)?.drafts ?? [];
  return drafts.length ? null : <>{children}</>;
}

export function AddSongForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(DraftContext);
  const [error, setError] = useState<string>();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const draft: Draft = {
      id: Date.now(),
      title: String(fd.get("title") ?? "").trim(),
      artist: String(fd.get("artist") ?? "").trim(),
      songKey: String(fd.get("songKey") ?? ""),
    };
    // Put back what was typed so nothing is lost if the save fails.
    const restore = () => {
      for (const name of ["title", "artist", "songKey"] as const) {
        const el = form.elements.namedItem(name);
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = draft[name];
      }
    };
    form.reset();
    setError(undefined);
    startTransition(async () => {
      ctx?.add(draft);
      try {
        const res = await action(undefined, fd);
        if (res?.error) {
          restore();
          setError(res.error);
        }
      } catch (err) {
        if (isRedirect(err)) throw err;
        restore();
        setError(FAILED);
      }
    });
  }

  return (
    <form className={className} onSubmit={submit}>
      {children}
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
