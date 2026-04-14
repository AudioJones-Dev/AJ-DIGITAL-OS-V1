/**
 * R2 Storage Client — Cloudflare R2 (S3-compatible)
 *
 * Stores mission artifacts (outputs, reports, configs).
 * Uses S3-compatible REST API with minimal auth.
 *
 * Requires env:
 *   R2_ENDPOINT       — e.g. https://<account-id>.r2.cloudflarestorage.com
 *   R2_ACCESS_KEY_ID  — S3-compatible access key
 *   R2_SECRET_ACCESS_KEY — S3-compatible secret
 *   R2_BUCKET_NAME    — bucket name
 */

import { createHmac, createHash } from "node:crypto";

// ── Configuration ──────────────────────────────────────────────────

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string | undefined;
}

function resolveConfig(override?: Partial<R2Config>): R2Config {
  return {
    endpoint: override?.endpoint ?? process.env.R2_ENDPOINT?.trim() ?? "",
    accessKeyId: override?.accessKeyId ?? process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
    secretAccessKey: override?.secretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
    bucketName: override?.bucketName ?? process.env.R2_BUCKET_NAME?.trim() ?? "",
    region: override?.region ?? "auto",
  };
}

function isConfigured(cfg: R2Config): boolean {
  return cfg.endpoint.length > 0 && cfg.accessKeyId.length > 0 && cfg.secretAccessKey.length > 0 && cfg.bucketName.length > 0;
}

// ── Result Type ────────────────────────────────────────────────────

export interface R2Result<T = unknown> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

// ── AWS Signature V4 (minimal) ─────────────────────────────────────

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secret}`, date);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: string | Buffer,
  cfg: R2Config,
): Record<string, string> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const region = cfg.region ?? "auto";
  const service = "s3";

  headers["x-amz-date"] = amzDate;
  headers["x-amz-content-sha256"] = sha256Hex(body);

  const signedHeaderKeys = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const signedHeaders = signedHeaderKeys.join(";");

  const canonicalHeaders = signedHeaderKeys
    .map((k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!]!.trim()}`)
    .join("\n") + "\n";

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.replace(/^\?/, ""),
    canonicalHeaders,
    signedHeaders,
    sha256Hex(body),
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(cfg.secretAccessKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  headers["Authorization"] =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return headers;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Upload a file to R2.
 * Returns the object key on success.
 */
export async function putObject(
  key: string,
  body: string | Buffer,
  contentType = "application/octet-stream",
  config?: Partial<R2Config>,
): Promise<R2Result<string>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "R2 not configured" };

  const url = new URL(`/${cfg.bucketName}/${key}`, cfg.endpoint);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    Host: url.host,
  };

  const bodyBuf = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
  const signed = signRequest("PUT", url, headers, bodyBuf, cfg);

  try {
    const res = await fetch(url.toString(), {
      method: "PUT",
      headers: signed,
      body: new Uint8Array(bodyBuf),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, data: null, error: `R2 PUT ${res.status}: ${text.slice(0, 300)}` };
    }
    return { ok: true, data: key, error: null };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Download an object from R2.
 * Returns the body as a string.
 */
export async function getObject(
  key: string,
  config?: Partial<R2Config>,
): Promise<R2Result<string>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "R2 not configured" };

  const url = new URL(`/${cfg.bucketName}/${key}`, cfg.endpoint);
  const headers: Record<string, string> = { Host: url.host };
  const signed = signRequest("GET", url, headers, "", cfg);

  try {
    const res = await fetch(url.toString(), { headers: signed });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, data: null, error: `R2 GET ${res.status}: ${text.slice(0, 300)}` };
    }
    const text = await res.text();
    return { ok: true, data: text, error: null };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete an object from R2.
 */
export async function deleteObject(
  key: string,
  config?: Partial<R2Config>,
): Promise<R2Result<boolean>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "R2 not configured" };

  const url = new URL(`/${cfg.bucketName}/${key}`, cfg.endpoint);
  const headers: Record<string, string> = { Host: url.host };
  const signed = signRequest("DELETE", url, headers, "", cfg);

  try {
    const res = await fetch(url.toString(), { method: "DELETE", headers: signed });
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => "");
      return { ok: false, data: null, error: `R2 DELETE ${res.status}: ${text.slice(0, 300)}` };
    }
    return { ok: true, data: true, error: null };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Build an R2 key for a mission artifact.
 * Format: missions/{runRef}/{filename}
 */
export function missionArtifactKey(runRef: string, filename: string): string {
  return `missions/${runRef}/${filename}`;
}
