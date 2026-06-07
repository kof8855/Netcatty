import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider } from "../../application/i18n/I18nProvider.tsx";
import type { Host } from "../../types.ts";
import { TerminalToolbar } from "./TerminalToolbar.tsx";

const sshHost: Host = {
  id: "host-1",
  label: "Host",
  hostname: "example.com",
  username: "root",
  tags: [],
  os: "linux",
  protocol: "ssh",
};

const renderToolbar = (
  host: Host,
  status: "connecting" | "connected" | "disconnected" = "connected",
  props: Partial<React.ComponentProps<typeof TerminalToolbar>> = {},
) =>
  renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      { locale: "en" },
      React.createElement(TerminalToolbar, {
        status,
        host,
        onToggleSidePanel: () => {},
        onOpenScripts: () => {},
        onOpenTheme: () => {},
        ...props,
      }),
    ),
  );

test("keeps side panel toggle visible before the terminal overflow menu for SSH sessions", () => {
  const markup = renderToolbar(sshHost);

  const toggleIndex = markup.indexOf('aria-label="terminal.toolbar.toggleSidePanel"');
  const moreIndex = markup.indexOf('aria-label="More actions"');

  assert.notEqual(toggleIndex, -1);
  assert.notEqual(moreIndex, -1);
  assert.ok(toggleIndex < moreIndex);
});

test("keeps side panel toggle visible for local terminal sessions", () => {
  const markup = renderToolbar({
    ...sshHost,
    id: "local-1",
    protocol: "local",
  });

  assert.ok(markup.includes('aria-label="terminal.toolbar.toggleSidePanel"'));
});

test("uses the terminal active button color for pressed toolbar actions", () => {
  const markup = renderToolbar(sshHost, "connected", {
    isSearchOpen: true,
    onToggleSearch: () => {},
  });

  assert.match(
    markup,
    /aria-label="Search terminal"[^>]*style="background-color:var\(--terminal-toolbar-btn-active\)"/,
  );
});
