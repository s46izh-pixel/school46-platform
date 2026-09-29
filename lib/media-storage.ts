import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type MediaStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type StoredMediaObject = {
  body: Uint8Array;
  contentType: string;
  contentLength?: number;
  cacheControl?: string;
};

let cachedClient: S3Client | null = null;
let cachedClientKey = "";

export function isMediaStorageConfigured() {
  return Boolean(readMediaStorageConfig());
}

export function mediaFileUrl(key: string) {
  return `/api/media/file?key=${encodeURIComponent(key)}`;
}

export async function uploadMediaObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
  fileName: string;
  publicMedia: boolean;
  metadata?: Record<string, string>;
}) {
  const config = requiredMediaStorageConfig();
  const client = mediaStorageClient(config);
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    Body: input.body,
    ContentLength: input.body.byteLength,
    ContentType: input.contentType || "application/octet-stream",
    ContentDisposition: `inline; filename="${asciiHeaderFileName(input.fileName)}"`,
    CacheControl: input.publicMedia ? "public, max-age=31536000, immutable" : "private, no-store",
    Metadata: input.metadata
  }));
}

export async function deleteMediaObject(key: string) {
  if (!isSafeMediaKey(key)) throw new Error("Invalid media key");
  const config = requiredMediaStorageConfig();
  await mediaStorageClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function getMediaObject(key: string): Promise<StoredMediaObject> {
  const config = requiredMediaStorageConfig();
  const client = mediaStorageClient(config);
  const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!response.Body) throw new Error("Media object has no body");
  const body = await response.Body.transformToByteArray();
  return {
    body,
    contentType: response.ContentType || "application/octet-stream",
    contentLength: response.ContentLength,
    cacheControl: response.CacheControl
  };
}

export function isSafeMediaKey(key: string) {
  if (!key || key.length > 900 || key.startsWith("/") || key.includes("\\") || key.includes("..")) return false;
  return /^(events|news|applications)\/[a-z0-9][a-z0-9/_\-.]*$/i.test(key);
}

function readMediaStorageConfig(): MediaStorageConfig | null {
  const endpoint = env("MEDIA_S3_ENDPOINT", "S3_ENDPOINT").replace(/\/$/, "");
  const region = env("MEDIA_S3_REGION", "S3_REGION");
  const bucket = env("MEDIA_S3_BUCKET", "S3_BUCKET");
  const accessKeyId = env("MEDIA_S3_ACCESS_KEY", "S3_ACCESS_KEY");
  const secretAccessKey = env("MEDIA_S3_SECRET_KEY", "S3_SECRET_KEY");
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

function requiredMediaStorageConfig() {
  const config = readMediaStorageConfig();
  if (!config) throw new Error("Media storage is not configured");
  return config;
}

function mediaStorageClient(config: MediaStorageConfig) {
  const clientKey = [config.endpoint, config.region, config.bucket, config.accessKeyId].join("|");
  if (!cachedClient || cachedClientKey !== clientKey) {
    cachedClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    cachedClientKey = clientKey;
  }
  return cachedClient;
}

function env(primary: string, fallback: string) {
  return (process.env[primary] || process.env[fallback] || "").trim();
}

function asciiHeaderFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}
