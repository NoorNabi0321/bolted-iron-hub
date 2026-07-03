// Object storage backed by Cloudflare R2 (S3-compatible API).
// Keeps the same storagePut/storageGet surface the app already uses.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (!ENV.r2Endpoint || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey || !ENV.r2Bucket) {
    throw new Error(
      "R2 storage not configured: set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET"
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: ENV.r2Endpoint,
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
      },
    });
  }
  return cachedClient;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Resolve a usable URL for a stored object. Prefers the bucket's public base
 * URL (permanent, good for URLs persisted in the DB); falls back to a signed
 * URL when the bucket is private.
 */
async function resolveUrl(key: string): Promise<string> {
  if (ENV.r2PublicBase) {
    return `${ENV.r2PublicBase.replace(/\/+$/, "")}/${key}`;
  }
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: ENV.r2Bucket, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 } // 7 days
  );
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  await getClient().send(
    new PutObjectCommand({
      Bucket: ENV.r2Bucket,
      Key: key,
      Body: typeof data === "string" ? Buffer.from(data) : data,
      ContentType: contentType,
    })
  );
  return { key, url: await resolveUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: await resolveUrl(key) };
}
