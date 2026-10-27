"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check, Copy, Home, Menu, MessageCircle, Share, UserRound } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { formData, isRedirect, useSaver } from "./optimistic";

export function SubmitButton({
  children,
  pending,
  className = "btn",
  ...rest
}: { children: ReactNode; pending?: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} aria-busy={status.pending} {...rest}>
      {status.pending && pending ? pending : children}
    </button>
  );
}

/**
 * A Yes / Maybe / No style choice. The new answer shows the moment it's tapped and
 * saves in the background; if the save fails it goes back and a toast says so.
 */
export function AutoSeg({
  action,
  name,
  value,
  options,
  hidden,
  label,
  wide,
}: {
  action: (form: FormData) => Promise<void>;
  name: string;
  value: string | null;
  options: { value: string; label: string }[];
  hidden: Record<string, string | number>;
  label: string;
  wide?: boolean;
}) {
  const [current, pick] = useBackgroundSave(action, name, value, hidden);
  // The form only scopes the radio group, so arrow keys stay within this row. It never submits.
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className={`seg${wide ? " wide" : ""}`} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={current === o.value} onChange={() => pick(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </form>
  );
}

/**
 * Keeps a control's value on screen while its save runs. Server props only take
 * over again once nothing is saving, so a reply to an older tap can't undo a newer one.
 */
function useBackgroundSave<T extends string | null>(
  action: (form: FormData) => Promise<void>,
  name: string,
  value: T,
  hidden: Record<string, string | number>,
) {
  const { fail } = useSaver();
  const [current, setCurrent] = useState<T>(value);
  const saving = useRef(0);
  useEffect(() => {
    if (saving.current === 0) setCurrent(value);
  }, [value]);
  function pick(next: T) {
    const before = current;
    setCurrent(next);
    saving.current++;
    startTransition(async () => {
      try {
        await action(formData({ ...hidden, [name]: next ?? "" }));
      } catch (e) {
        if (isRedirect(e)) throw e;
        setCurrent(before);
        fail();
      } finally {
        saving.current--;
      }
    });
  }
  return [current, pick] as const;
}

/** A form for actions that report back (errors or a short confirmation). */
export function StateForm({
  action,
  children,
  className,
  resetOnOk,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="notice ok" role="status">
          {state.ok}
        </p>
      ) : null}
    </form>
  );
}

export function CopyButton({ text, label = "Copy", done = "Copied", className = "btn sm" }: { text: string; label?: string; done?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          window.prompt("Copy this text:", text);
        }
      }}
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

/**
 * Sends text straight into a chat: a WhatsApp link that works everywhere, plus the phone's own
 * share sheet (Telegram, Messages…) where the browser has one. The share button only appears
 * after the page loads, once we know the browser supports it.
 */
export function ShareButtons({ text, className = "btn sm" }: { text: string; className?: string }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  return (
    <>
      <a className={className} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={16} aria-hidden />
        Send in WhatsApp
      </a>
      {canShare ? (
        <button
          type="button"
          className={className}
          onClick={() => {
            // Closing the share sheet without picking an app rejects; that's fine.
            navigator.share({ text }).catch(() => {});
          }}
        >
          <Share size={16} aria-hidden />
          Other apps
        </button>
      ) : null}
    </>
  );
}

/** A destructive button that asks once, in place, before submitting. */
export function ConfirmButton({
  children,
  question,
  confirm,
  className = "btn sm ghost",
}: {
  children: ReactNode;
  question: string;
  confirm: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="actions" role="group" aria-label={question}>
      <span className="small">{question}</span>
      <SubmitButton className="btn sm danger" pending="Working…">
        {confirm}
      </SubmitButton>
      <button type="button" className="btn sm ghost" onClick={() => setAsking(false)}>
        Keep
      </button>
    </span>
  );
}

const TABS = [
  { href: "", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/me", label: "Me", Icon: UserRound },
  { href: "/more", label: "More", Icon: Menu },
];

function useActiveTab(base: string) {
  const path = usePathname();
  return (href: string) => {
    const full = base + href;
    if (href === "") return path === base || path.startsWith(`${base}/m/`);
    if (href === "/more") return path.startsWith(full) || path.startsWith(`${base}/organiser`);
    return path.startsWith(full);
  };
}

export function TabsInline({ base }: { base: string }) {
  const active = useActiveTab(base);
  return (
    <nav className="tabs-inline" aria-label="Main">
      {TABS.map(({ href, label }) => (
        <Link key={label} href={base + href} aria-current={active(href) ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function TabBar({ base }: { base: string }) {
  const active = useActiveTab(base);
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={label} href={base + href} aria-current={active(href) ? "page" : undefined}>
          <Icon size={22} strokeWidth={active(href) ? 2.1 : 1.7} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Toast({ message }: { message: string }) {
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");
  useEffect(() => {
    const leave = setTimeout(() => setPhase("leaving"), 2600);
    const gone = setTimeout(() => setPhase("gone"), 2800);
    return () => {
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, []);
  if (phase === "gone") return null;
  return (
    <div className={phase === "leaving" ? "toast is-leaving" : "toast"} role="status">
      {message}
    </div>
  );
}

export function TimezoneInput() {
  const [tz, setTz] = useState("UTC");
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {}
  }, []);
  return <input type="hidden" name="timezone" value={tz} />;
}

/** A select that saves as soon as it changes, showing the new choice straight away. */
export function AutoSelect({
  action,
  hidden,
  name,
  value,
  options,
  className,
  label,
  id,
}: {
  action: (form: FormData) => Promise<void>;
  hidden: Record<string, string | number>;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  label?: string;
  id?: string;
}) {
  const [current, pick] = useBackgroundSave(action, name, value, hidden);
  return (
    <select id={id} className={className} name={name} value={current} aria-label={label} onChange={(e) => pick(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * iOS Safari only shows :active styles once the page has a touch listener,
 * so without this the press scale on buttons never appears on iPhones.
 */
export function TouchActive() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
