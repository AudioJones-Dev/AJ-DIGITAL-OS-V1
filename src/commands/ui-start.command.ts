import { WebShellServer } from "../ui/web-shell-server.js";

export interface UiStartCommandInput {
  host?: string;
  port?: number;
  json?: boolean;
}

export interface UiStartCommandResult {
  ok: boolean;
  command: "ui-start";
  rendered: boolean;
  host: string;
  port: number;
  url: string;
  warnings: string[];
  errors: string[];
}

export class UiStartCommand {
  constructor(private readonly server = new WebShellServer()) {}

  async run(input: UiStartCommandInput = {}): Promise<UiStartCommandResult> {
    const host = normalizeHost(input.host);
    const port = normalizePort(input.port);
    const started = await this.server.start({ host, port });

    const result: UiStartCommandResult = {
      ok: true,
      command: "ui-start",
      rendered: true,
      host: started.host,
      port: started.port,
      url: started.url,
      warnings: [
        "The local web shell is a thin control surface over the current runtime.",
        "File attach, local path attach, and external integrations remain scaffold-level in this patch.",
      ],
      errors: [],
    };

    if (input.json === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("AJ DIGITAL OS LOCAL UI");
      console.log("======================");
      console.log(`URL: ${result.url}`);
      console.log("Interface: local-first web/chat shell");
      console.log("Runtime: layered on top of the existing assistant runtime, history, deliverables, brands, and profile registries");
      console.log("");
      console.log("Warnings");
      for (const warning of result.warnings) {
        console.log(`- ${warning}`);
      }
      console.log("");
      console.log("Press Ctrl+C to stop the local UI server.");
    }

    return result;
  }
}

const normalizeHost = (value: string | undefined): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "127.0.0.1";
};

const normalizePort = (value: number | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  const envValue = process.env.AJ_OS_UI_PORT;
  const parsed = envValue ? Number(envValue) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 4318;
};
