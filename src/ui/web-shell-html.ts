import {
  AppShell,
  ChatComposer,
  ChatMessages,
  FloatingActionRail,
  RightPanel,
  Sidebar,
  TopBar,
} from "./web-shell-components.js";

export const renderWebShellHtml = (): string => {
  const mainContent = `${ChatMessages()}${ChatComposer()}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AJ Digital OS Local UI</title>
    <link rel="stylesheet" href="/ui.css" />
  </head>
  <body>
    ${AppShell({
      sidebar: Sidebar(),
      topBar: TopBar(),
      mainContent,
      rail: FloatingActionRail(),
      rightPanel: RightPanel(),
    })}
    <template id="chat-template">
      ${mainContent}
    </template>
    <script type="module" src="/ui.js"></script>
  </body>
</html>`;
};
