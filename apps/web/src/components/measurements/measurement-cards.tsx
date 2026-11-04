"use client";
import * as c from "@fitloom/application/measurement-card-contracts";
import * as m from "@fitloom/application/measurement-contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useLeaveProtection,
  useNavigationGuard,
} from "@/components/workspace/navigation-guard";
import {
  MeasurementRequestError,
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";
import { MeasurementOptions } from "./measurement-options";

type Owner = ReturnType<typeof m.measurementContext.parse>;
type Detail = ReturnType<typeof m.measurementDetail.parse>;
type Draft = ReturnType<typeof c.measurementCardSelection.parse> & {
  label: string;
};
type Step = {
  name: ReturnType<typeof c.measurementCardCommandName.parse>;
  bytes: string;
};
type Work = { steps: Step[]; index: number };
const envelope = (payload: unknown) =>
  JSON.stringify({
    payload,
    operationKey: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
  });
export function MeasurementCardProjection({
  data,
}: {
  data: ReturnType<typeof c.measurementCardProjection.parse>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Card preview</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <p>{data.wearerLabel}</p>
        <Alert>
          <AlertDescription>{data.warning}</AlertDescription>
        </Alert>
        {data.items.map((item) => (
          <section key={item.position}>
            <h4>{item.profileLabel}</h4>
            <p>
              {item.schemaLabel} · {item.measuredOn} · {item.sourceKind}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {item.values.map((value, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: The fixed projection order is stable and deliberately excludes field IDs.
                <div key={`${item.position}:${index}`}>
                  <dt>{value.label}</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {c.measurementCardValueText(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p>
          Authenticated staff access is required. Printed or downloaded copies
          remain with their holder.
        </p>
      </CardContent>
    </Card>
  );
}
export function MeasurementCards({
  owner,
  api,
  initial,
  onDenied,
}: {
  owner: Owner;
  api: string;
  initial?: Detail;
  onDenied: () => void;
}) {
  const [open, setOpen] = useState(false),
    guard = useNavigationGuard();
  if (!owner.capabilities.cardManage && !owner.capabilities.cardIssue)
    return null;
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next && !guard.confirmLeave()) return;
          setOpen(next);
        }}
      >
        <SheetTrigger render={<Button type="button" variant="outline" />}>
          Measurement cards
        </SheetTrigger>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Measurement cards</SheetTitle>
            <SheetDescription>
              Select exact versions and fields for a fixed staff card. Issuer
              authority is checked whenever the QR is opened.
            </SheetDescription>
          </SheetHeader>
          {open ? (
            <CardEditor
              owner={owner}
              api={api}
              {...(initial ? { initial } : {})}
              onDenied={onDenied}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
function CardEditor({
  owner,
  api,
  initial,
  onDenied,
}: {
  owner: Owner;
  api: string;
  initial?: Detail;
  onDenied: () => void;
}) {
  const ownerApi = `${api}/${owner.customerId}/${owner.wearerId}`;
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState({ search: "", offset: 0 }),
    [book, setBook] = useState<ReturnType<
      typeof m.measurementBook.parse
    > | null>(null),
    [profile, setProfile] = useState(initial?.profileId ?? ""),
    [version, setVersion] = useState(initial?.versionId ?? ""),
    [source, setSource] = useState<Detail | null>(initial ?? null),
    [history, setHistory] = useState<ReturnType<
      typeof m.measurementHistory.parse
    > | null>(null),
    [before, setBefore] = useState<number | null>(null),
    [chosen, setChosen] = useState<string[]>([]),
    [selections, setSelections] = useState<Draft[]>([]),
    [days, setDays] = useState("7"),
    [preview, setPreview] = useState<ReturnType<
      typeof c.measurementCardProjection.parse
    > | null>(null),
    [cards, setCards] = useState<ReturnType<
      typeof c.measurementCardList.parse
    > | null>(null),
    [cardQuery, setCardQuery] = useState<{
      after: ReturnType<typeof c.measurementCardCursor.parse> | null;
    }>({ after: null }),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [denied, setDenied] = useState(false),
    [created, setCreated] = useState<string | null>(null),
    [state, setState] = useState<
      { kind: "idle" } | { kind: "working" | "uncertain"; work: Work }
    >({ kind: "idle" }),
    [previewBusy, setPreviewBusy] = useState(false);
  const live = useRef(true),
    previewRequest = useRef(0),
    locked = state.kind !== "idle";
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      previewRequest.current++;
    };
  }, []);
  const fail = useCallback(
    (error: unknown) => {
      setMessage(measurementMessage(error));
      if (measurementDenied(error)) {
        setDenied(true);
        onDenied();
      }
    },
    [onDenied],
  );
  useLeaveProtection({
    active:
      !denied &&
      (selections.length > 0 || chosen.length > 0 || state.kind !== "idle"),
    uncertain: state.kind === "uncertain",
    locked: state.kind === "working",
    noun: "measurement card",
  });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setBook(null);
    void measurementRequest(`${ownerApi}/book`, m.measurementBook, {
      body: { ...query, status: "all", kind: "all", limit: 25 },
      signal: controller.signal,
    })
      .then((result) => {
        if (active) setBook(result);
      })
      .catch((error) => {
        if (active) fail(error);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ownerApi, query, fail]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    const controller = new AbortController();
    setHistory(null);
    void measurementRequest(
      `${ownerApi}/${profile}/history`,
      m.measurementHistory,
      {
        body: { beforeSequence: before, limit: 25 },
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((error) => {
        if (active) fail(error);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ownerApi, profile, before, fail]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    const controller = new AbortController();
    setSource(null);
    void measurementRequest(
      `${ownerApi}/${profile}${version ? `/versions/${version}` : ""}`,
      m.measurementDetail,
      { signal: controller.signal },
    )
      .then((result) => {
        if (active) setSource(result);
      })
      .catch((error) => {
        if (active) fail(error);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ownerApi, profile, version, fail]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCards(null);
    void measurementRequest(`${ownerApi}/cards`, c.measurementCardList, {
      body: { after: cardQuery.after },
      signal: controller.signal,
    })
      .then((result) => {
        if (active) setCards(result);
      })
      .catch((error) => {
        if (active) fail(error);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ownerApi, cardQuery, fail]);
  const invalidate = () => {
    setPreview(null);
    setPreviewBusy(false);
    previewRequest.current++;
  };
  const perform = async (start: Work) => {
    let work = start;
    setState({ kind: "working", work });
    setMessage("");
    try {
      let result: ReturnType<typeof c.measurementCardResponse.parse> | null =
        null;
      while (work.index < work.steps.length) {
        const step = work.steps[work.index];
        if (!step) throw Error("Missing card step");
        result = await measurementRequest(
          `${api}/commands/${step.name}`,
          c.measurementCardResponse,
          { bytes: step.bytes },
        );
        work = { ...work, index: work.index + 1 };
        if (!live.current) return;
      }
      if (!result) throw Error("Missing card result");
      setCreated(
        work.steps.at(-1)?.name === "measurement-card.create"
          ? result.result.cardId
          : null,
      );
      setMessage(
        work.steps.at(-1)?.name === "measurement-card.create"
          ? "Measurement card issued. Open its protected page to print or download the QR."
          : "Measurement card revoked. Subsequent reads are unavailable.",
      );
      setState({ kind: "idle" });
      setSelections([]);
      setChosen([]);
      invalidate();
      setCardQuery({ after: null });
    } catch (error) {
      if (!live.current) return;
      if (measurementDenied(error)) {
        fail(error);
        return;
      }
      setState(
        !(error instanceof MeasurementRequestError) ||
          ["temporary", "busy"].includes(error.code)
          ? { kind: "uncertain", work }
          : { kind: "idle" },
      );
      setMessage(
        work.index > 0
          ? `The previous step completed. ${measurementMessage(error)}`
          : measurementMessage(error),
      );
    }
  };
  const createStep = (
    selected: ReturnType<typeof c.measurementCardSelection.parse>[],
  ): Step | null => {
    const parsed = c.measurementCardCreate.safeParse({
      customerId: owner.customerId,
      wearerId: owner.wearerId,
      selections: selected,
      expiresInDays: Number(days),
    });
    if (!parsed.success) {
      setMessage(
        "Choose one to ten exact versions, one to thirty fields each, and an expiry of 1–30 days.",
      );
      return null;
    }
    return { name: "measurement-card.create", bytes: envelope(parsed.data) };
  };
  if (denied)
    return (
      <Alert>
        <AlertDescription>
          Measurement card access is unavailable.
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="flex min-w-0 flex-col gap-5 px-4 pb-6">
      {owner.capabilities.cardIssue && owner.active ? (
        <>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="card-profile-search">
                Find card source profiles
              </FieldLabel>
              <Input
                id="card-profile-search"
                value={search}
                disabled={locked}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={locked}
              onClick={() => setQuery({ search, offset: 0 })}
            >
              Find card profiles
            </Button>
          </FieldGroup>
          {book ? (
            <>
              <MeasurementOptions
                id="card-source-profile"
                label="Card source profile"
                value={profile}
                disabled={locked}
                items={[
                  { value: "", label: "Choose a profile" },
                  ...(source &&
                  !book.items.some(
                    (item) => item.profileId === source.profileId,
                  )
                    ? [
                        {
                          value: source.profileId,
                          label: source.document.label,
                        },
                      ]
                    : []),
                  ...book.items.map((item) => ({
                    value: item.profileId,
                    label: item.label,
                  })),
                ]}
                onChange={(id) => {
                  setProfile(id);
                  setVersion("");
                  setSource(null);
                  setChosen([]);
                  setBefore(null);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || query.offset === 0}
                  onClick={() =>
                    setQuery((q) => ({
                      ...q,
                      offset: Math.max(0, q.offset - 25),
                    }))
                  }
                >
                  Previous card profiles
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || book.nextOffset === null}
                  onClick={() =>
                    book.nextOffset !== null &&
                    setQuery((q) => ({ ...q, offset: book.nextOffset ?? 0 }))
                  }
                >
                  Next card profiles
                </Button>
              </div>
            </>
          ) : (
            <p role="status">Loading card sources…</p>
          )}
          {history ? (
            <>
              <MeasurementOptions
                id="card-source-version"
                label="Card source version"
                value={version}
                disabled={locked}
                items={[
                  { value: "", label: "Current version" },
                  ...(source &&
                  version &&
                  !history.items.some((item) => item.versionId === version)
                    ? [{ value: version, label: `Version ${source.sequence}` }]
                    : []),
                  ...history.items.map((item) => ({
                    value: item.versionId,
                    label: `Version ${item.sequence} · ${item.measuredOn}`,
                  })),
                ]}
                onChange={(id) => {
                  setVersion(id);
                  setSource(null);
                  setChosen([]);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || before === null}
                  onClick={() => setBefore(null)}
                >
                  Latest card source versions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || history.nextBeforeSequence === null}
                  onClick={() => setBefore(history.nextBeforeSequence)}
                >
                  Older card source versions
                </Button>
              </div>
            </>
          ) : null}
          {source ? (
            <>
              <p>
                {source.document.label} · exact version {source.sequence}
              </p>
              <FieldGroup>
                {[
                  ...source.document.schema.fields,
                  ...source.document.customFields,
                ].map((field) => (
                  <Field key={field.id} orientation="horizontal">
                    <Checkbox
                      id={`card-field-${field.id}`}
                      checked={chosen.includes(field.id)}
                      disabled={
                        locked ||
                        (!chosen.includes(field.id) && chosen.length >= 30)
                      }
                      onCheckedChange={(checked) =>
                        setChosen((ids) =>
                          checked
                            ? [...ids, field.id]
                            : ids.filter((id) => id !== field.id),
                        )
                      }
                    />
                    <FieldLabel htmlFor={`card-field-${field.id}`}>
                      {field.label}
                      {field.kind === "length" ? ` · ${field.basis} basis` : ""}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
              <Button
                type="button"
                variant="outline"
                disabled={
                  locked ||
                  chosen.length === 0 ||
                  (selections.length >= 10 &&
                    !selections.some(
                      (item) => item.versionId === source.versionId,
                    )) ||
                  !source.effectiveActive
                }
                onClick={() => {
                  const parsed = c.measurementCardSelection.parse({
                    profileId: source.profileId,
                    versionId: source.versionId,
                    fieldIds: chosen,
                  });
                  setSelections((items) => [
                    ...items.filter(
                      (item) => item.versionId !== source.versionId,
                    ),
                    {
                      ...parsed,
                      label: `${source.document.label} · version ${source.sequence}`,
                    },
                  ]);
                  setChosen([]);
                  invalidate();
                }}
              >
                Add exact version to card
              </Button>
            </>
          ) : profile ? (
            <p role="status">Loading exact source…</p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {selections.map((item, index) => (
              <li key={item.versionId}>
                {item.label} · {item.fieldIds.length} selected fields{" "}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={locked}
                  onClick={() => {
                    setSelections((items) =>
                      items.filter(
                        (value) => value.versionId !== item.versionId,
                      ),
                    );
                    invalidate();
                  }}
                >
                  Remove card version {index + 1}
                </Button>
              </li>
            ))}
          </ul>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="card-expiry">Card expiry in days</FieldLabel>
              <Input
                id="card-expiry"
                type="number"
                min={1}
                max={30}
                value={days}
                disabled={locked}
                onChange={(event) => setDays(event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={locked || previewBusy || !selections.length}
                onClick={async () => {
                  const parsed = c.measurementCardSelections.safeParse(
                    selections.map(({ profileId, versionId, fieldIds }) => ({
                      profileId,
                      versionId,
                      fieldIds,
                    })),
                  );
                  if (!parsed.success) return;
                  const request = ++previewRequest.current;
                  setPreviewBusy(true);
                  setPreview(null);
                  try {
                    const result = await measurementRequest(
                      `${ownerApi}/card-preview`,
                      c.measurementCardProjection,
                      { body: { selections: parsed.data } },
                    );
                    if (live.current && request === previewRequest.current)
                      setPreview(result);
                  } catch (error) {
                    if (request === previewRequest.current) fail(error);
                  } finally {
                    if (request === previewRequest.current)
                      setPreviewBusy(false);
                  }
                }}
              >
                Preview selected card
              </Button>
              <Button
                type="button"
                disabled={locked || !selections.length}
                onClick={() => {
                  const step = createStep(
                    selections.map(({ profileId, versionId, fieldIds }) => ({
                      profileId,
                      versionId,
                      fieldIds,
                    })),
                  );
                  if (step) void perform({ steps: [step], index: 0 });
                }}
              >
                Issue measurement card
              </Button>
            </div>
          </FieldGroup>
          {preview ? <MeasurementCardProjection data={preview} /> : null}
        </>
      ) : (
        <p>
          Card issuance requires current card-management authority and an active
          wearer. You can revoke your issued cards below.
        </p>
      )}
      {state.kind === "uncertain" ? (
        <Button type="button" onClick={() => void perform(state.work)}>
          Retry exact card operation
        </Button>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      ) : null}
      {created ? (
        <a
          className="self-start text-primary underline"
          href={c.measurementCardPath(created)}
          target="_blank"
          rel="noreferrer"
        >
          Open issued card for print and QR
        </a>
      ) : null}
      <h3>Issued cards</h3>
      <p>
        Removing an issuer's role can make a printed card unavailable. Reissue
        uses your current identity and creates a separate grant.
      </p>
      <Field>
        <FieldLabel htmlFor="card-revoke-reason">
          Card revocation reason
        </FieldLabel>
        <Input
          id="card-revoke-reason"
          value={reason}
          disabled={locked}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {cards ? (
        cards.items.length ? (
          cards.items.map((item, index) => (
            <Card key={item.cardId}>
              <CardHeader>
                <CardTitle>
                  <h4>Issued card {index + 1}</h4>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p>
                  Issued {item.issuedAt}
                  <br />
                  Expires {item.expiresAt}
                </p>
                <p>
                  {item.revokedAt
                    ? "Revoked"
                    : item.issuerAvailable
                      ? "Issuer remains authorized"
                      : "Issuer authority is unavailable"}
                </p>
                {!item.revokedAt && item.issuerAvailable ? (
                  <a
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                    href={c.measurementCardPath(item.cardId)}
                  >
                    Open card {index + 1}
                  </a>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={locked || !!item.revokedAt || !reason.trim()}
                    onClick={() =>
                      void perform({
                        steps: [
                          {
                            name: "measurement-card.revoke",
                            bytes: envelope({
                              customerId: owner.customerId,
                              wearerId: owner.wearerId,
                              cardId: item.cardId,
                              expectedRevision: item.revision,
                              reason,
                            }),
                          },
                        ],
                        index: 0,
                      })
                    }
                  >
                    Revoke card {index + 1}
                  </Button>
                  {owner.capabilities.cardIssue && owner.active ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={locked || (!item.revokedAt && !reason.trim())}
                      onClick={() => {
                        const create = createStep(item.selections);
                        if (!create) return;
                        const steps: Step[] = item.revokedAt
                          ? [create]
                          : [
                              {
                                name: "measurement-card.revoke",
                                bytes: envelope({
                                  customerId: owner.customerId,
                                  wearerId: owner.wearerId,
                                  cardId: item.cardId,
                                  expectedRevision: item.revision,
                                  reason,
                                }),
                              },
                              create,
                            ];
                        void perform({ steps, index: 0 });
                      }}
                    >
                      {item.revokedAt
                        ? `Reissue card ${index + 1} under my identity`
                        : `Revoke and reissue card ${index + 1}`}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No issued cards are available.</p>
        )
      ) : (
        <p role="status">Loading issued cards…</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={locked}
          onClick={() => {
            setCardQuery({ after: null });
          }}
        >
          Refresh issued cards
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={locked || !cards?.next}
          onClick={() => cards?.next && setCardQuery({ after: cards.next })}
        >
          Older issued cards
        </Button>
      </div>
    </div>
  );
}
