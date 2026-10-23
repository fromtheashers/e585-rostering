"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check, Copy, Home, Menu, UserRound } from "lucide-react";
import type { FormState } from "@/lib/actions";

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

/** A Yes / Maybe / No style choice that saves as soon as it changes. */
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
  const formRef = useRef<HTMLFormElement>(null);
  const [current, setCurrent] = useState(value);
  useEffect(() => setCurrent(value), [value]);
  return (
    <form ref={formRef} action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SegInner
        name={name}
        current={current}
        options={options}
        label={label}
        wide={wide}
        onPick={(v) => {
          setCurrent(v);
          requestAnimationFrame(() => formRef.current?.requestSubmit());
        }}
      />
    </form>
  );
}

function SegInner({
  name,
  current,
  options,
  label,
  wide,
  onPick,
}: {
  name: string;
  current: string | null;
  options: { value: string; label: string }[];
  label: string;
  wide?: boolean;
  onPick: (v: string) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className={`seg${wide ? " wide" : ""}`} role="radiogroup" aria-label={label} data-pending={pending}>
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={current === o.value}
            onChange={() => onPick(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
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

/** A select that saves as soon as it changes (used in the roster grid). */
export function AutoSelect({
  action,
  hidden,
  name,
  value,
  options,
  className,
  label,
}: {
  action: (form: FormData) => Promise<void>;
  hidden: Record<string, string | number>;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <AutoSelectInner name={name} value={value} options={options} className={className} label={label} onPick={() => ref.current?.requestSubmit()} />
    </form>
  );
}

function AutoSelectInner({
  name,
  value,
  options,
  className,
  label,
  onPick,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  label: string;
  onPick: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <select
      key={value}
      className={className}
      name={name}
      defaultValue={value}
      aria-label={label}
      aria-busy={pending}
      disabled={pending}
      onChange={onPick}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
