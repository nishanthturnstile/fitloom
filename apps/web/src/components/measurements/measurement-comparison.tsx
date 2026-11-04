"use client";
import * as c from "@fitloom/application/measurement-contracts";
import { displayMeasurementRatio } from "@fitloom/application/measurement-reuse";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/workspace/page-header";
import {
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";
import { MeasurementOptions } from "./measurement-options";

type Owner = ReturnType<typeof c.measurementContext.parse>;
type Selection = ReturnType<typeof c.measurementExactSelection.parse> & {
  label: string;
  sequence: number;
};
export function MeasurementComparison({
  owner,
  bookPath,
  api,
}: {
  owner: Owner;
  bookPath: string;
  api: string;
}) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState({ search: "", offset: 0 }),
    [book, setBook] = useState<ReturnType<
      typeof c.measurementBook.parse
    > | null>(null),
    [profile, setProfile] = useState(""),
    [history, setHistory] = useState<ReturnType<
      typeof c.measurementHistory.parse
    > | null>(null),
    [before, setBefore] = useState<number | null>(null),
    [anchorId, setAnchorId] = useState<string | null>(null),
    [anchor, setAnchor] = useState<ReturnType<
      typeof c.measurementDetail.parse
    > | null>(null),
    [selection, setSelection] = useState<Selection[]>([]),
    [unit, setUnit] = useState<"cm" | "in">("cm"),
    [comparison, setComparison] = useState<ReturnType<
      typeof c.measurementComparison.parse
    > | null>(null),
    [busy, setBusy] = useState(false),
    [fieldId, setFieldId] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [trend, setTrend] = useState<ReturnType<
      typeof c.measurementTrend.parse
    > | null>(null),
    [trendBusy, setTrendBusy] = useState(false),
    [error, setError] = useState(""),
    [denied, setDenied] = useState(false);
  const mounted = useRef(true),
    compareRequest = useRef(0),
    trendRequest = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      compareRequest.current++;
      trendRequest.current++;
    };
  }, []);
  const fail = useCallback((problem: unknown) => {
    setError(measurementMessage(problem));
    if (measurementDenied(problem)) setDenied(true);
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setBook(null);
    setError("");
    void measurementRequest(`${api}/book`, c.measurementBook, {
      body: { ...query, status: "all", kind: "all", limit: 25 },
      signal: controller.signal,
    })
      .then((result) => {
        if (!active) return;
        setBook(result);
      })
      .catch((problem) => {
        if (active) fail(problem);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, query, fail]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    const controller = new AbortController();
    setHistory(null);
    void measurementRequest(`${api}/${profile}/history`, c.measurementHistory, {
      body: { limit: 25, beforeSequence: before },
      signal: controller.signal,
    })
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((problem) => {
        if (active) fail(problem);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, profile, before, fail]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    const controller = new AbortController();
    setAnchor(null);
    setTrend(null);
    setTrendBusy(false);
    trendRequest.current++;
    setFieldId("");
    void measurementRequest(
      `${api}/${profile}${anchorId ? `/versions/${anchorId}` : ""}`,
      c.measurementDetail,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!active) return;
        setAnchor(result);
        const date = owner.today ?? result.measuredOn;
        setFrom(`${date.slice(0, 4)}-01-01`);
        setTo(date);
        setFieldId(
          [
            ...result.document.schema.fields,
            ...result.document.customFields,
          ].find((f) => f.kind === "length" || f.kind === "number")?.id ?? "",
        );
      })
      .catch((problem) => {
        if (active) fail(problem);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, profile, anchorId, owner.today, fail]);
  const compare = async () => {
    const request = ++compareRequest.current;
    setBusy(true);
    setError("");
    setComparison(null);
    try {
      const result = await measurementRequest(
        `${api}/compare`,
        c.measurementComparison,
        {
          body: {
            versions: selection.map((item) => ({
              profileId: item.profileId,
              versionId: item.versionId,
            })),
            unit,
          },
        },
      );
      if (mounted.current && request === compareRequest.current)
        setComparison(result);
    } catch (problem) {
      if (request === compareRequest.current) fail(problem);
    } finally {
      if (request === compareRequest.current) setBusy(false);
    }
  };
  const loadTrend = async (
    after: ReturnType<typeof c.measurementTrendCursor.parse> | null,
  ) => {
    if (!anchor) return;
    const request = ++trendRequest.current;
    setTrendBusy(true);
    setError("");
    setTrend(null);
    try {
      const parsed = c.measurementTrendFilters.safeParse({
        anchorVersionId: anchor.versionId,
        fieldId,
        from,
        to,
        unit,
        after,
        limit: 50,
      });
      if (!parsed.success) {
        setError(
          "Choose a numeric dimension and a valid date window of at most 3660 days.",
        );
        return;
      }
      const result = await measurementRequest(
        `${api}/${anchor.profileId}/trend`,
        c.measurementTrend,
        { body: parsed.data },
      );
      if (mounted.current && request === trendRequest.current) setTrend(result);
    } catch (problem) {
      if (request === trendRequest.current) fail(problem);
    } finally {
      if (request === trendRequest.current) setTrendBusy(false);
    }
  };
  const add = (versionId: string, label: string, sequence: number) => {
    if (
      selection.length >= 4 ||
      selection.some((s) => s.versionId === versionId)
    )
      return;
    const exact = c.measurementExactSelection.parse({
      profileId: profile,
      versionId,
    });
    compareRequest.current++;
    setBusy(false);
    setSelection((previous) => [...previous, { ...exact, label, sequence }]);
    setComparison(null);
  };
  if (denied)
    return (
      <Alert>
        <AlertDescription>Measurement access is unavailable.</AlertDescription>
      </Alert>
    );
  const numeric = anchor
    ? [
        ...anchor.document.schema.fields,
        ...anchor.document.customFields,
      ].filter((field) => field.kind === "length" || field.kind === "number")
    : [];
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <a className="self-start text-sm text-primary underline" href={bookPath}>
        Back to measurement book
      </a>
      <PageHeader
        eyebrow={`${owner.customerName} · ${owner.wearerName}`}
        title="Compare measurements"
        description="Choose two to four exact versions of this wearer. Original quantities and recorded definitions remain unchanged."
      />
      {error ? (
        <Alert>
          <AlertDescription role="status">{error}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Choose exact versions</h2>
          </CardTitle>
          <CardDescription>
            Start with one profile's history, or explicitly add versions from
            other profiles of this wearer. Archived history remains readable.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setQuery({ search, offset: 0 });
            }}
          >
            <FieldGroup className="sm:flex-row sm:items-end">
              <Field>
                <FieldLabel htmlFor="compare-search">
                  Find measurement profiles
                </FieldLabel>
                <Input
                  id="compare-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </Field>
              <Button type="submit" variant="outline">
                Find profiles
              </Button>
            </FieldGroup>
          </form>
          {book ? (
            <>
              <MeasurementOptions
                id="compare-profile"
                label="Profile history"
                value={profile}
                items={[
                  { value: "", label: "Choose a profile" },
                  ...(anchor &&
                  !book.items.some(
                    (item) => item.profileId === anchor.profileId,
                  )
                    ? [
                        {
                          value: anchor.profileId,
                          label: anchor.document.label,
                        },
                      ]
                    : []),
                  ...book.items.map((item) => ({
                    value: item.profileId,
                    label: `${item.label}${item.archivedAt ? " · archived" : ""}`,
                  })),
                ]}
                onChange={(id) => {
                  setProfile(id);
                  setAnchor(null);
                  setHistory(null);
                  setFieldId("");
                  setTrendBusy(false);
                  trendRequest.current++;
                  setBefore(null);
                  setAnchorId(null);
                  setTrend(null);
                }}
              />
              {book.total === 0 ? (
                <p>
                  No matching profiles. Change the search to see other records.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={query.offset === 0}
                  onClick={() =>
                    setQuery((q) => ({
                      ...q,
                      offset: Math.max(0, q.offset - 25),
                    }))
                  }
                >
                  Previous profiles
                </Button>
                <Button
                  variant="outline"
                  disabled={book.nextOffset === null}
                  onClick={() =>
                    book.nextOffset !== null &&
                    setQuery((q) => ({ ...q, offset: book.nextOffset ?? 0 }))
                  }
                >
                  Next profiles
                </Button>
              </div>
            </>
          ) : (
            <p role="status">Loading profiles…</p>
          )}
          {history ? (
            <>
              <ul className="flex flex-col gap-2">
                {history.items.map((item) => (
                  <li
                    key={item.versionId}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <span className="min-w-0 break-words">
                      Version {item.sequence} · {item.label} · {item.measuredOn}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        selection.length >= 4 ||
                        selection.some((s) => s.versionId === item.versionId)
                      }
                      onClick={() =>
                        add(item.versionId, item.label, item.sequence)
                      }
                    >
                      Add version {item.sequence}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={before === null}
                  onClick={() => setBefore(null)}
                >
                  Latest versions
                </Button>
                <Button
                  variant="outline"
                  disabled={history.nextBeforeSequence === null}
                  onClick={() => setBefore(history.nextBeforeSequence)}
                >
                  Older versions
                </Button>
              </div>
            </>
          ) : profile ? (
            <p role="status">Loading profile history…</p>
          ) : null}
          <ul
            className="flex flex-col gap-2"
            aria-label="Selected exact versions"
          >
            {selection.map((item, index) => (
              <li
                key={item.versionId}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="min-w-0 break-words">
                  {index + 1}. {item.label} · version {item.sequence}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelection((previous) =>
                      previous.filter((s) => s.versionId !== item.versionId),
                    );
                    compareRequest.current++;
                    setBusy(false);
                    setComparison(null);
                  }}
                >
                  Remove selected version {index + 1}
                </Button>
              </li>
            ))}
          </ul>
          <Field>
            <FieldLabel htmlFor="comparison-unit">Comparison unit</FieldLabel>
            <MeasurementOptions
              id="comparison-unit"
              label="Comparison unit"
              value={unit}
              items={[
                { value: "cm", label: "cm" },
                { value: "in", label: "in" },
              ]}
              onChange={(value) => {
                if (value === "cm" || value === "in") {
                  setUnit(value);
                  setComparison(null);
                  setTrend(null);
                  setBusy(false);
                  setTrendBusy(false);
                  compareRequest.current++;
                  trendRequest.current++;
                }
              }}
            />
          </Field>
          <Button
            disabled={selection.length < 2 || busy}
            onClick={() => void compare()}
          >
            Compare selected versions
          </Button>
        </CardContent>
      </Card>
      {comparison ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Exact comparison</h2>
            </CardTitle>
            <CardDescription>
              Status and differences use exact arithmetic. Converted displays
              may round. Fractions show exact deltas; missing values and false
              remain distinct. Cross-basis or ambiguous fields are incompatible.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table>
              <TableCaption>
                Exact quantities and differences across{" "}
                {comparison.versions.length} versions. Length deltas use{" "}
                {comparison.unit}; other numeric deltas use saved number units.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimension</TableHead>
                  {comparison.versions.map((version, index) => (
                    <TableHead
                      key={version.versionId}
                      className="min-w-40 whitespace-normal"
                    >
                      {index + 1}. {version.label} · version {version.sequence}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableHead
                      scope="row"
                      className="max-w-60 whitespace-normal break-words"
                    >
                      {row.label}
                      {row.basis ? ` · ${row.basis}` : ""}
                    </TableHead>
                    {row.cells.map((cell, index) => (
                      <TableCell
                        key={comparison.versions[index]?.versionId ?? index}
                        className="min-w-40 max-w-80 whitespace-normal break-words"
                      >
                        <p className="font-mono">{cell.display}</p>
                        <p>{cell.status}</p>
                        {cell.transformed ? (
                          <p>Transformed by reviewed ease</p>
                        ) : null}
                        {cell.converted ? (
                          <p>
                            {cell.converted.approximate ? "≈ " : ""}
                            {cell.converted.decimal} {comparison.unit}
                          </p>
                        ) : null}
                        {cell.delta ? (
                          <div className="flex flex-col gap-1">
                            <p>
                              Difference{" "}
                              {displayMeasurementRatio(cell.delta).approximate
                                ? "≈ "
                                : ""}
                              {displayMeasurementRatio(cell.delta).decimal}
                              {row.basis ? ` ${comparison.unit}` : ""}
                            </p>
                            <details>
                              <summary className="cursor-pointer">
                                Exact difference
                              </summary>
                              <p className="break-all">
                                {cell.delta.numerator}/{cell.delta.denominator}
                                {row.basis ? ` ${comparison.unit}` : ""}
                              </p>
                            </details>
                          </div>
                        ) : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Dimension trend</h2>
          </CardTitle>
          <CardDescription>
            Choose a numeric field in one exact version of the selected profile.
            Each page contains at most 50 records. Missing and incompatible
            values make gaps. Plots are approximate; the table retains original
            quantities.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {anchor ? (
            <>
              <MeasurementOptions
                id="trend-anchor"
                label="Trend anchor version"
                value={anchor.versionId}
                items={[
                  {
                    value: anchor.versionId,
                    label: `Version ${anchor.sequence}`,
                  },
                  ...(history?.items ?? [])
                    .filter((item) => item.versionId !== anchor.versionId)
                    .map((item) => ({
                      value: item.versionId,
                      label: `Version ${item.sequence}`,
                    })),
                ]}
                onChange={setAnchorId}
              />
              <MeasurementOptions
                id="trend-field"
                label="Numeric dimension"
                value={fieldId}
                items={[
                  { value: "", label: "Choose a numeric dimension" },
                  ...numeric.map((field) => ({
                    value: field.id,
                    label: field.label,
                  })),
                ]}
                onChange={(value) => {
                  setFieldId(value);
                  setTrend(null);
                  setTrendBusy(false);
                  trendRequest.current++;
                }}
              />
              <FieldGroup className="sm:grid sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="trend-from">From date</FieldLabel>
                  <Input
                    id="trend-from"
                    type="date"
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setTrend(null);
                      setTrendBusy(false);
                      trendRequest.current++;
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="trend-to">Through date</FieldLabel>
                  <Input
                    id="trend-to"
                    type="date"
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setTrend(null);
                      setTrendBusy(false);
                      trendRequest.current++;
                    }}
                  />
                </Field>
              </FieldGroup>
              <Button
                variant="outline"
                disabled={!fieldId || trendBusy}
                onClick={() => void loadTrend(null)}
              >
                Load trend
              </Button>
            </>
          ) : (
            <p>Select a profile to choose its numeric fields.</p>
          )}
          {trend ? (
            <>
              <p role="status">
                {trend.items.length} records on this page.{" "}
                {trend.next
                  ? "More records are available."
                  : "End of this date window."}
              </p>
              {trend.items.length > 0 ? (
                <section
                  className="min-w-0"
                  aria-label="Approximate dimension trend"
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      accessibilityLayer
                      data={trend.items.map((item, index) => ({
                        index,
                        date: item.measuredOn,
                        quantity:
                          item.decimal === null ? null : Number(item.decimal),
                      }))}
                      title="Dimension trend with missing-value gaps"
                    >
                      <CartesianGrid />
                      <XAxis
                        dataKey="index"
                        tickFormatter={(index) =>
                          trend.items[Number(index)]?.measuredOn ?? ""
                        }
                      />
                      <YAxis domain={["auto", "auto"]} width={60} />
                      <Tooltip
                        labelFormatter={(index) =>
                          trend.items[Number(index)]?.measuredOn ?? ""
                        }
                        formatter={(value) => [
                          String(value),
                          trend.field.kind === "length"
                            ? trend.unit
                            : "saved units",
                        ]}
                      />
                      <Line
                        dataKey="quantity"
                        stroke="var(--primary)"
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </section>
              ) : null}
              <Table>
                <TableCaption>
                  Every record in this page, ordered by measured date, recording
                  time and version ID.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Measured</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trend.items.map((item) => (
                    <TableRow key={item.versionId}>
                      <TableCell>
                        <a
                          className="text-primary underline"
                          href={`${bookPath}/${profile}/versions/${item.versionId}`}
                        >
                          {item.measuredOn}
                        </a>
                        <p className="text-xs">{item.recordedAt}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal break-words font-mono">
                        {item.original}
                      </TableCell>
                      <TableCell className="font-mono">
                        {item.decimal === null
                          ? "Not plotted"
                          : `${item.approximate ? "≈ " : ""}${item.decimal}${trend.field.kind === "length" ? ` ${trend.unit}` : ""}`}
                      </TableCell>
                      <TableCell>
                        {item.status}
                        {item.transformed ? " · transformed" : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={trendBusy}
                  onClick={() => void loadTrend(null)}
                >
                  First trend page
                </Button>
                <Button
                  variant="outline"
                  disabled={trend.next === null || trendBusy}
                  onClick={() => void loadTrend(trend.next)}
                >
                  Next trend page
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
