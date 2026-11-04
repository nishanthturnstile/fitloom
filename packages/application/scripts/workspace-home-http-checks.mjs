import assert from "node:assert/strict";

// Uses real authorized APIs and the rendered Home, never fixture-derived totals.
export async function workspaceHomeHttpChecks({ base, workspacePath, cookie }) {
  const headers = { cookie };
  const home = await fetch(`${base}${workspacePath.replace("/api", "")}`, {
    headers,
  });
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, />Home<\/h1>/);
  for (const [kind, label] of [
    ["garments", "Available garments"],
    ["services", "Available services"],
    ["addons", "Available add-ons"],
  ]) {
    const result = await fetch(
      `${base}${workspacePath}/masters/${kind}?limit=1`,
      { headers },
    );
    assert.equal(result.status, 200);
    const { total } = await result.json();
    // The count follows the named tile; Next may add a text separator before it.
    const tile = html.slice(html.indexOf(`<h2>${label}</h2>`));
    assert.ok(tile.length < html.length, `${label} tile missing`);
    assert.match(
      tile.split('data-slot="card"')[0],
      new RegExp(`tabular-nums[^>]*>${total}<`),
    );
  }
  assert.match(html, /Measurements for each named wearer/);
  assert.match(html, /Find a wearer[^<]*measurements/);
  assert.doesNotMatch(html, /Next build/);
  assert.doesNotMatch(html, /Recently edited|saved-revision aggregate/);
}
