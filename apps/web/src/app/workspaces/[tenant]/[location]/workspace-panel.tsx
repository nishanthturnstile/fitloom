"use client";
import type {
  WorkspaceTeam,
  WorkspaceView,
} from "@fitloom/application/workspace-contracts";
import {
  changeRolePermission,
  workspacePermissionLabel,
  workspaceTeam,
} from "@fitloom/application/workspace-contracts";
import { type FormEvent, useState } from "react";

type Team = WorkspaceTeam;
function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
export function WorkspacePanel({
  workspace,
  section,
  team: initialTeam,
  principalId,
  locale,
}: {
  workspace: WorkspaceView;
  section: "shop" | "preferences" | "access";
  team: Team | null;
  principalId: string;
  locale: string;
}) {
  const [team, setTeam] = useState(initialTeam);
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const base = `/api/workspaces/${workspace.tenantId}/${workspace.locationId}`;
  async function command(path: string, payload: unknown, method = "POST") {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationKey: crypto.randomUUID(),
          correlationId: crypto.randomUUID(),
          payload,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof data.message === "string"
            ? data.message
            : "Action unavailable",
        );
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Try again");
    } finally {
      setBusy(false);
    }
  }
  function form(
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => Promise<void>,
  ) {
    event.preventDefault();
    void action(new FormData(event.currentTarget));
  }
  async function moreTeam() {
    if (!team || team.nextOffset === null) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`${base}/team?offset=${team.nextOffset}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error("Team unavailable; your access may have changed");
      const page = workspaceTeam.parse(await response.json());
      setTeam((previous) =>
        previous
          ? {
              roles: [
                ...new Map(
                  [...previous.roles, ...page.roles].map((row) => [
                    row.id,
                    row,
                  ]),
                ).values(),
              ],
              members: [
                ...new Map(
                  [...previous.members, ...page.members].map((row) => [
                    row.id,
                    row,
                  ]),
                ).values(),
              ],
              invitations: [
                ...new Map(
                  [...previous.invitations, ...page.invitations].map((row) => [
                    row.id,
                    row,
                  ]),
                ).values(),
              ],
              counts: page.counts,
              nextOffset: page.nextOffset,
            }
          : page,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Team unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="workspace-panel">
        {section === "shop" && (
          <section className="account-card">
            <h2>Shop profile</h2>
            <dl>
              <dt>Business mode</dt>
              <dd>{workspace.businessMode ?? "Setup pending"}</dd>
              <dt>Timezone</dt>
              <dd>{workspace.timezone ?? "Setup pending"}</dd>
              <dt>Address</dt>
              <dd>{workspace.address ?? "Setup pending"}</dd>
            </dl>
            {workspace.owner ? (
              <>
                <h3>Owner contact</h3>
                <p>
                  {workspace.owner.name}
                  <br />
                  {workspace.owner.email}
                  <br />
                  {workspace.owner.phone}
                </p>
              </>
            ) : null}
            {workspace.permissions.includes("workspace.manage") ? (
              <form
                onSubmit={(e) =>
                  form(e, async (f) =>
                    command(
                      base,
                      {
                        expectedVersion: workspace.version,
                        shopName: field(f, "shopName"),
                        address: field(f, "address"),
                      },
                      "PATCH",
                    ),
                  )
                }
              >
                <label>
                  Shop name
                  <input
                    name="shopName"
                    defaultValue={workspace.shopName}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Address
                  <input
                    name="address"
                    defaultValue={workspace.address ?? ""}
                    required
                    maxLength={1000}
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Update shop profile
                </button>
              </form>
            ) : null}
            {workspace.permissions.includes("locations.all") ? (
              <button
                type="button"
                className="account-secondary"
                onClick={async () => {
                  const response = await fetch(`${base}?view=all`, {
                    cache: "no-store",
                  });
                  const data: unknown = await response.json();
                  if (response.ok && Array.isArray(data))
                    setNotice(
                      `All ${response.headers.get("X-Total-Count") ?? data.length} locations authorized. ${data.flatMap((item) => (typeof item === "object" && item !== null && "name" in item && typeof item.name === "string" ? [item.name] : [])).join(", ")}`,
                    );
                  else
                    setNotice(
                      "You do not have consolidated access to every location.",
                    );
                }}
              >
                View all locations
              </button>
            ) : null}
          </section>
        )}
        {section === "preferences" && (
          <section className="account-card">
            <h2>Your access</h2>
            <p className="account-muted">
              Permissions are checked for this location on each request.
            </p>
            <ul className="permission-list">
              {workspace.permissions.map((p) => (
                <li key={p} title={p}>
                  {workspacePermissionLabel(p)}
                </li>
              ))}
            </ul>
            <details>
              <summary>Personal preferences</summary>
              <form
                onSubmit={(e) =>
                  form(e, async (f) =>
                    command("/api/preferences", {
                      locale: field(f, "locale"),
                      tenantId: workspace.tenantId,
                      locationId: workspace.locationId,
                    }),
                  )
                }
              >
                <label>
                  Preferred language
                  <select
                    name="locale"
                    aria-label="Preferred language"
                    defaultValue={locale}
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil</option>
                    <option value="hi">Hindi</option>
                  </select>
                </label>
                <button type="submit" disabled={busy}>
                  Save preference
                </button>
              </form>
              <p className="account-muted">
                Saves your language preference. Interface translations follow
                their own implementation.
              </p>
            </details>
          </section>
        )}
      </div>
      {section === "access" && team ? (
        <section className="account-card workspace-team">
          <h2>People & access</h2>
          <p>
            {team.members.length} of {team.counts.members} people ·{" "}
            {team.roles.length} of {team.counts.roles} roles
          </p>
          {team.nextOffset !== null ? (
            <button
              type="button"
              className="account-secondary"
              disabled={busy}
              onClick={() => void moreTeam()}
            >
              Load more people, roles, and invitations
            </button>
          ) : null}
          <form
            className="team-invite"
            onSubmit={(e) =>
              form(e, async (f) =>
                command(`${base}/actions/invite`, {
                  email: field(f, "email"),
                  roleId: field(f, "role"),
                }),
              )
            }
          >
            <label>
              Invite email
              <input name="email" type="email" required />
            </label>
            <label>
              Role
              <select name="role">
                {team.roles.map((role) => (
                  <option value={role.id} key={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={busy}>
              Send invitation
            </button>
          </form>
          <h3>Members</h3>
          {team.members.map((m) => (
            <form
              key={`${m.id}:${m.roleId}`}
              className="team-member"
              onSubmit={(e) =>
                form(e, async (f) =>
                  command(`${base}/actions/member`, {
                    membershipId: m.id,
                    roleId: field(f, "role"),
                    expectedVersion: m.version,
                    enabled: true,
                  }),
                )
              }
            >
              <span>
                {m.name}
                {m.owner ? " · owner" : ""}
              </span>
              <select
                name="role"
                defaultValue={m.roleId}
                aria-label={`Role for ${m.name}`}
                disabled={m.principalId === principalId}
              >
                {!team.roles.some((role) => role.id === m.roleId) ? (
                  <option value={m.roleId}>Current role</option>
                ) : null}
                {team.roles.map((role) => (
                  <option value={role.id} key={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {m.principalId !== principalId ? (
                <>
                  <button type="submit" disabled={busy}>
                    Change role
                  </button>
                  <button
                    type="button"
                    className="account-secondary"
                    disabled={busy}
                    onClick={() =>
                      void command(`${base}/actions/member`, {
                        membershipId: m.id,
                        roleId: m.roleId,
                        expectedVersion: m.version,
                        enabled: false,
                      })
                    }
                  >
                    Remove location access
                  </button>
                </>
              ) : (
                <small>Your own assignment is protected.</small>
              )}
            </form>
          ))}
          <h3>Invitations</h3>
          {team.invitations.map((i) => (
            <div className="team-member" key={i.id}>
              <span>{i.email}</span>
              <small>
                {i.accepted
                  ? "Accepted"
                  : i.revoked
                    ? "Revoked"
                    : `Expires ${new Date(i.expiresAt).toLocaleDateString()}`}
              </small>
              {!i.accepted && !i.revoked ? (
                <>
                  <a href={`/invitations/${i.id}`}>Invitation link</a>
                  <button
                    type="button"
                    className="account-secondary"
                    disabled={busy}
                    onClick={() =>
                      void command(`${base}/actions/revoke`, {
                        invitationId: i.id,
                      })
                    }
                  >
                    Revoke
                  </button>
                </>
              ) : null}
            </div>
          ))}
          <details>
            <summary>Create a custom role</summary>
            <form
              onSubmit={(e) =>
                form(e, async (f) =>
                  command(`${base}/actions/role`, {
                    name: field(f, "name"),
                    permissions: f
                      .getAll("permission")
                      .filter((value) => typeof value === "string"),
                  }),
                )
              }
            >
              <label>
                Role name
                <input name="name" required maxLength={80} />
              </label>
              <div className="permission-list">
                {workspace.permissions.map((p) => (
                  <label key={p}>
                    <input
                      type="checkbox"
                      name="permission"
                      value={p}
                      defaultChecked={p === "workspace.read"}
                      onChange={(event) => {
                        const form = event.currentTarget.form;
                        if (!form) return;
                        const inputs = [
                          ...form.querySelectorAll<HTMLInputElement>(
                            'input[name="permission"]',
                          ),
                        ];
                        const selected = changeRolePermission(
                          inputs
                            .filter(
                              (input) =>
                                input.checked && input !== event.currentTarget,
                            )
                            .map((input) => input.value),
                          p,
                          event.currentTarget.checked,
                        );
                        for (const input of inputs)
                          input.checked = selected.includes(input.value);
                      }}
                    />
                    {workspacePermissionLabel(p)}
                  </label>
                ))}
              </div>
              <button type="submit" disabled={busy}>
                Create role
              </button>
            </form>
            <p className="account-muted">
              Preset definitions stay protected. You can delegate only
              permissions you currently hold.
            </p>
          </details>
        </section>
      ) : null}
      <p role="status" className="account-notice">
        {notice}
      </p>
    </>
  );
}
