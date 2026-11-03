"use client";
import {
  type CustomerProfile,
  customerCreate,
  customerErrorResponse,
  customerResponse,
  customerReturnToken,
  customerUpdate,
} from "@fitloom/application/customer-contracts";
import {
  customerPhone,
  customerPhoneCountries,
} from "@fitloom/application/customer-phone";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useLeaveProtection,
  useNavigationGuard,
} from "@/components/workspace/navigation-guard";

type Saved = { id: string; version: number; profile: CustomerProfile };
type Response = ReturnType<typeof customerResponse.parse>;
type Review = Extract<Response, { outcome: "review-required" }>["review"];
type Pending = {
  command: "customer.create" | "customer.update" | "customer.restore";
  bytes: string;
};
type State =
  | { kind: "idle" }
  | { kind: "blocked"; pending: Pending | null }
  | { kind: "saving"; pending: Pending }
  | { kind: "uncertain"; pending: Pending }
  | { kind: "review"; review: Review };
const empty: CustomerProfile = {
  name: "",
  phone: null,
  email: null,
  address: null,
  taxCountryCode: null,
  gstin: null,
  segment: null,
  notes: null,
  preferences: { fit: null, fabric: null, design: null },
  tags: [],
};
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryOptions = customerPhoneCountries.map((code) => (
  <option key={code} value={code}>
    {countryNames.of(code) ?? code}
  </option>
));
const nullable = (v: string) => v || null;
const clean = (v: string | null) => v?.trim() || null;
export function CustomerForm({
  base,
  saved,
  canRestore,
}: {
  base: string;
  saved?: Saved;
  canRestore: boolean;
}) {
  const [profile, setProfile] = useState(saved?.profile ?? empty),
    [country, setCountry] = useState<string>(
      saved?.profile.phone?.countryCode ?? "IN",
    ),
    [phone, setPhone] = useState(saved?.profile.phone?.display ?? ""),
    [noPhone, setNoPhone] = useState(saved ? !saved.profile.phone : false),
    [self, setSelf] = useState(true),
    [tags, setTags] = useState(saved?.profile.tags.join("\n") ?? ""),
    [state, setState] = useState<State>({ kind: "idle" }),
    [issues, setIssues] = useState<{ path: string; message: string }[]>([]),
    [message, setMessage] = useState(""),
    [advisory, setAdvisory] = useState("");
  const form = useRef<HTMLFormElement>(null),
    details = useRef<HTMLDetailsElement>(null),
    [token, setToken] = useState<string | null>(null);
  const guard = useNavigationGuard();
  const dirty =
    JSON.stringify(profile) !== JSON.stringify(saved?.profile ?? empty) ||
    phone !== (saved?.profile.phone?.display ?? "") ||
    country !== (saved?.profile.phone?.countryCode ?? "IN") ||
    tags !== (saved?.profile.tags.join("\n") ?? "") ||
    noPhone !== (saved ? !saved.profile.phone : false) ||
    (!saved && !self);
  const locked =
    state.kind === "saving" ||
    state.kind === "uncertain" ||
    state.kind === "blocked";
  const blocked = state.kind === "blocked";
  useLeaveProtection({
    active: dirty || state.kind !== "idle",
    uncertain:
      state.kind === "uncertain" ||
      (state.kind === "blocked" && state.pending !== null),
    locked,
    noun: "customer",
  });
  useEffect(() => {
    const t = customerReturnToken.safeParse(
      new URL(location.href).searchParams.get("return"),
    );
    if (t.success) setToken(t.data);
  }, []);
  const back = `${base}/customers${token ? `?return=${token}` : ""}`;
  function patch(p: Partial<CustomerProfile>) {
    setProfile((v) => ({ ...v, ...p }));
    setState({ kind: "idle" });
    setMessage("");
  }
  // Advisory only. Save always performs the authoritative duplicate check.
  useEffect(() => {
    setAdvisory("");
    if (
      blocked ||
      noPhone ||
      !phone ||
      (saved &&
        phone === saved.profile.phone?.display &&
        country === saved.profile.phone.countryCode)
    )
      return;
    const parsed = customerPhone.safeParse({
      countryCode: country,
      display: phone,
    });
    if (!parsed.success) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `${base.replace("/workspaces/", "/api/workspaces/")}/customers/duplicate-check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: parsed.data,
              customerId: saved?.id ?? null,
            }),
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          },
        );
        if (!r.headers.get("content-type")?.includes("application/json"))
          return;
        const body: unknown = await r.json();
        if (controller.signal.aborted) return;
        if (!r.ok) {
          const denied = customerErrorResponse.safeParse(body);
          if (
            denied.success &&
            (denied.data.code === "denied" ||
              denied.data.code === "session-expired")
          ) {
            setState((previous) => ({
              kind: "blocked",
              pending:
                previous.kind === "saving" ||
                previous.kind === "uncertain" ||
                previous.kind === "blocked"
                  ? previous.pending
                  : null,
            }));
            setMessage(
              `${denied.data.message} Restore access before retrying. Reference: ${denied.data.correlationId}`,
            );
          }
          return;
        }
        if (
          !controller.signal.aborted &&
          typeof body === "object" &&
          body !== null &&
          "candidateCount" in body &&
          typeof body.candidateCount === "number" &&
          body.candidateCount > 0
        )
          setAdvisory(
            "This phone has saved matches. Saving will ask you to review them.",
          );
      } catch {
        /* Save remains authoritative. */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [base, phone, country, noPhone, saved, blocked]);
  function fieldError(path: string) {
    return issues.find((i) => i.path === path)?.message;
  }
  function focusIssues(next: typeof issues) {
    next = next.map((i) => ({
      ...i,
      path: i.path.startsWith("tags")
        ? "tags"
        : i.path.startsWith("phone")
          ? "phone"
          : i.path,
    }));
    setIssues(next);
    if (details.current) details.current.open = true;
    requestAnimationFrame(() => {
      document.getElementById(`customer-${next[0]?.path}`)?.focus();
    });
  }
  function prepare(review?: Review): Pending | null {
    let canonical: CustomerProfile["phone"] = null;
    if (!noPhone) {
      const p = customerPhone.safeParse({
        countryCode: country,
        display: phone,
      });
      if (!p.success) {
        focusIssues([
          {
            path: "phone",
            message: "Enter a valid phone or choose No phone provided.",
          },
        ]);
        return null;
      }
      canonical = p.data;
    }
    const intended = {
      ...profile,
      email: clean(profile.email),
      notes: clean(profile.notes),
      gstin: clean(profile.gstin),
      taxCountryCode: clean(profile.taxCountryCode),
      preferences: {
        fit: clean(profile.preferences.fit),
        fabric: clean(profile.preferences.fabric),
        design: clean(profile.preferences.design),
      },
      address: profile.address
        ? {
            ...profile.address,
            line1: clean(profile.address.line1),
            line2: clean(profile.address.line2),
            city: clean(profile.address.city),
            region: clean(profile.address.region),
            postalCode: clean(profile.address.postalCode),
          }
        : null,
      phone: canonical,
      tags: tags
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const intent = review
      ? {
          kind: saved ? "keep-duplicate-phone" : "keep-separate",
          reviewId: review.reviewId,
        }
      : { kind: "check-first" };
    const payload = saved
      ? customerUpdate.safeParse({
          customerId: saved.id,
          expectedVersion: saved.version,
          profile: intended,
          intent,
        })
      : customerCreate.safeParse({
          profile: intended,
          selfWearer: self
            ? {
                kind: "self",
                attributes: {
                  relationship: null,
                  birthday: null,
                  gender: { kind: "unspecified" },
                  height: null,
                  weight: null,
                  notes: null,
                  preferences: { fit: null, fabric: null, design: null },
                },
              }
            : { kind: "none" },
          intent,
        });
    if (!payload.success) {
      focusIssues(
        payload.error.issues.map((i) => ({
          path: i.path.filter((x) => x !== "profile").join("."),
          message: i.message,
        })),
      );
      return null;
    }
    setIssues([]);
    return {
      command: saved ? "customer.update" : "customer.create",
      bytes: JSON.stringify({
        operationKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        payload: payload.data,
      }),
    };
  }
  async function send(pending: Pending) {
    setState({ kind: "saving", pending });
    setMessage("");
    try {
      const r = await fetch(
        `${base.replace("/workspaces/", "/api/workspaces/")}/customers/commands/${pending.command}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: pending.bytes,
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.headers.get("content-type")?.includes("application/json"))
        throw Error("invalid response");
      const raw: unknown = await r.json();
      const parsed = customerResponse.safeParse(raw);
      if (!parsed.success) throw Error("invalid response");
      const body = parsed.data;
      if (body.outcome === "saved") {
        if (!r.ok) throw Error("invalid response");
        guard.commitNavigation(
          `${base}/customers/${body.result.customerId}?saved=${body.result.changed ? "1" : "unchanged"}${token ? `&return=${token}` : ""}`,
        );
        return;
      }
      if (body.outcome === "review-required") {
        setState({ kind: "review", review: body.review });
        return;
      }
      if (
        body.outcome === "review-expired" ||
        body.outcome === "review-stale"
      ) {
        setState({ kind: "idle" });
        setMessage(
          "The duplicate review changed or expired. Check again before saving.",
        );
        return;
      }
      // Infrastructure errors can occur after a command committed. Keep the exact envelope.
      if (
        body.code === "temporary" ||
        body.code === "invalid-response" ||
        body.code === "busy" ||
        body.code === "rate-limit"
      ) {
        setState({ kind: "uncertain", pending });
        setMessage(
          "The save outcome is unknown. Retry the same save to recover its result.",
        );
        return;
      }
      setState(
        body.code === "denied" || body.code === "session-expired"
          ? { kind: "blocked", pending }
          : { kind: "idle" },
      );
      setMessage(`${body.message} Reference: ${body.correlationId}`);
      focusIssues(
        body.issues.map((i) => ({
          path: i.path.filter((x) => x !== "profile").join("."),
          message: i.message,
        })),
      );
    } catch {
      setState({ kind: "uncertain", pending });
      setMessage(
        "The save outcome is unknown. Retry the same save to recover its result.",
      );
    }
  }
  function save(review?: Review) {
    const p = prepare(review);
    if (p) void send(p);
  }
  function input(
    path: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    type = "text",
  ) {
    return (
      <Field>
        <FieldLabel htmlFor={`customer-${path}`}>{label}</FieldLabel>
        <Input
          id={`customer-${path}`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!fieldError(path)}
          aria-describedby={fieldError(path) ? `error-${path}` : undefined}
        />
        {fieldError(path) && (
          <p id={`error-${path}`} className="text-sm text-destructive">
            {fieldError(path)}
          </p>
        )}
      </Field>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{saved ? "Edit customer" : "Add customer"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-5"
        >
          {message && <p role="alert">{message}</p>}
          {issues.length > 0 && (
            <div role="alert">
              <p>Check these fields:</p>
              <ul>
                {issues.map((i) => (
                  <li key={`${i.path}-${i.message}`}>
                    <a
                      className="text-primary underline"
                      href={`#customer-${i.path}`}
                    >
                      {i.path}: {i.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-5">
            {input("name", "Customer name", profile.name, (name) =>
              patch({ name }),
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="customer-country">Country</FieldLabel>
                <select
                  id="customer-country"
                  className="customer-filter"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState({ kind: "idle" });
                  }}
                >
                  {countryOptions}
                </select>
              </Field>
              {!noPhone &&
                input(
                  "phone",
                  "Phone",
                  phone,
                  (v) => {
                    setPhone(v);
                    setState({ kind: "idle" });
                  },
                  "tel",
                )}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noPhone}
                onChange={(e) => {
                  setNoPhone(e.target.checked);
                  setState({ kind: "idle" });
                }}
              />
              No phone provided
            </label>
            <p className="text-sm text-muted-foreground">
              Phone numbers are not verified.
            </p>
            {advisory && <p role="status">{advisory}</p>}
            {!saved ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={self}
                  onChange={(e) => {
                    setSelf(e.target.checked);
                    setState({ kind: "idle" });
                  }}
                />
                This customer is also a wearer
                {profile.name ? `: ${profile.name}` : ""}
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                Changing the contact name does not rename any wearer.
              </p>
            )}
            <details ref={details}>
              <summary className="cursor-pointer font-medium">
                Optional details
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                {input(
                  "email",
                  "Email",
                  profile.email ?? "",
                  (v) => patch({ email: nullable(v) }),
                  "email",
                )}
                {input(
                  "address.countryCode",
                  "Address country",
                  profile.address?.countryCode ?? "",
                  (v) =>
                    patch({
                      address: {
                        line1: null,
                        line2: null,
                        city: null,
                        region: null,
                        postalCode: null,
                        ...profile.address,
                        countryCode: v.toUpperCase(),
                      },
                    }),
                )}
                {(
                  ["line1", "line2", "city", "region", "postalCode"] as const
                ).map((k) => (
                  <div key={k}>
                    {input(
                      `address.${k}`,
                      {
                        line1: "Address line 1",
                        line2: "Address line 2",
                        city: "City",
                        region: "Region",
                        postalCode: "Postal code",
                      }[k],
                      profile.address?.[k] ?? "",
                      (v) =>
                        patch({
                          address: {
                            line1: null,
                            line2: null,
                            city: null,
                            region: null,
                            postalCode: null,
                            countryCode: country,
                            ...profile.address,
                            [k]: nullable(v),
                          },
                        }),
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => patch({ address: null })}
                >
                  Clear address
                </Button>
                {input(
                  "taxCountryCode",
                  "Tax country",
                  profile.taxCountryCode ?? "",
                  (v) => {
                    if (
                      profile.gstin &&
                      v.toUpperCase() !== "IN" &&
                      !confirm("Clear the saved GSTIN and change tax country?")
                    )
                      return;
                    patch({
                      taxCountryCode: nullable(v.toUpperCase()),
                      gstin: v.toUpperCase() === "IN" ? profile.gstin : null,
                    });
                  },
                )}
                {profile.taxCountryCode === "IN" &&
                  input("gstin", "GSTIN", profile.gstin ?? "", (v) =>
                    patch({ gstin: nullable(v.toUpperCase()) }),
                  )}
                <Field>
                  <FieldLabel htmlFor="customer-segment">
                    Staff-assigned segment
                  </FieldLabel>
                  <select
                    id="customer-segment"
                    className="customer-filter"
                    value={profile.segment ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      patch({
                        segment:
                          v === "new" ||
                          v === "regular" ||
                          v === "important" ||
                          v === "bulk"
                            ? v
                            : null,
                      });
                    }}
                  >
                    <option value="">No segment</option>
                    {["new", "regular", "important", "bulk"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-tags">
                    Tags (one per line)
                  </FieldLabel>
                  <textarea
                    id="customer-tags"
                    className="customer-filter min-h-24"
                    value={tags}
                    onChange={(e) => {
                      setTags(e.target.value);
                      setState({ kind: "idle" });
                    }}
                  />
                </Field>
                {(["notes", "fit", "fabric", "design"] as const).map((k) => (
                  <Field key={k}>
                    <FieldLabel
                      htmlFor={`customer-${k === "notes" ? k : `preferences.${k}`}`}
                    >
                      {k === "notes"
                        ? "Notes"
                        : `${k[0]?.toUpperCase()}${k.slice(1)} preferences`}
                    </FieldLabel>
                    <textarea
                      id={`customer-${k === "notes" ? k : `preferences.${k}`}`}
                      className="customer-filter min-h-24"
                      value={
                        (k === "notes"
                          ? profile.notes
                          : profile.preferences[k]) ?? ""
                      }
                      onChange={(e) =>
                        patch(
                          k === "notes"
                            ? { notes: nullable(e.target.value) }
                            : {
                                preferences: {
                                  ...profile.preferences,
                                  [k]: nullable(e.target.value),
                                },
                              },
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            </details>
          </fieldset>
          {state.kind === "review" && (
            <section
              aria-label="Duplicate review"
              className="flex flex-col gap-4 rounded-lg border border-border p-4"
            >
              <h2 className="font-medium">Review matching phone</h2>
              <p>
                {state.review.candidateCount} saved matches. A shared phone does
                not prove these are the same person.
              </p>
              {state.review.candidates.map((c) => (
                <div
                  key={c.customerId}
                  className="flex flex-wrap items-center gap-3"
                >
                  <span className="break-words">
                    {c.name} · {c.archivedAt ? "Archived" : "Active"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      guard.navigate(
                        `${base}/customers/${c.customerId}${token ? `?return=${token}` : ""}`,
                      )
                    }
                  >
                    Open existing customer
                  </Button>
                  {c.archivedAt && canRestore && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (guard.confirmLeave())
                          void send({
                            command: "customer.restore",
                            bytes: JSON.stringify({
                              operationKey: crypto.randomUUID(),
                              correlationId: crypto.randomUUID(),
                              payload: {
                                customerId: c.customerId,
                                expectedVersion: c.version,
                              },
                            }),
                          });
                      }}
                    >
                      Restore existing customer
                    </Button>
                  )}
                </div>
              ))}
              {state.review.candidateCount > 5 && (
                <a href={back}>Find all matches in Customers</a>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (state.kind === "review") save(state.review);
                }}
              >
                {saved
                  ? "Use this phone for this customer anyway"
                  : "Keep separate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setState({ kind: "idle" })}
              >
                Back to edit
              </Button>
            </section>
          )}
          <div className="flex flex-wrap gap-3">
            {state.kind === "uncertain" ||
            (state.kind === "blocked" && state.pending) ? (
              <Button
                type="button"
                onClick={() => {
                  if (
                    (state.kind === "uncertain" || state.kind === "blocked") &&
                    state.pending
                  )
                    void send(state.pending);
                }}
              >
                Retry save
              </Button>
            ) : (
              state.kind !== "review" &&
              state.kind !== "blocked" && (
                <Button type="submit" disabled={state.kind === "saving"}>
                  {state.kind === "saving"
                    ? "Saving customer…"
                    : message.includes("Check again")
                      ? "Check again"
                      : "Save customer"}
                </Button>
              )
            )}
            <Button
              type="button"
              variant="outline"
              disabled={state.kind === "saving"}
              onClick={() =>
                guard.navigate(
                  saved
                    ? `${base}/customers/${saved.id}${token ? `?return=${token}` : ""}`
                    : back,
                )
              }
            >
              Cancel
            </Button>
            {message && saved && state.kind === "idle" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => guard.navigate(location.href)}
              >
                Reload saved customer
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
