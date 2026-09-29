import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

const values = Object.fromEntries(
  (await readFile(new URL("../.env.local", import.meta.url), "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    })
);

const required = ["MEDIA_S3_ENDPOINT", "MEDIA_S3_REGION", "MEDIA_S3_BUCKET", "MEDIA_S3_ACCESS_KEY", "MEDIA_S3_SECRET_KEY"];
const missing = required.filter((name) => !values[name]);
if (missing.length) throw new Error(`Missing media storage settings: ${missing.join(", ")}`);

const client = new S3Client({
  endpoint: values.MEDIA_S3_ENDPOINT,
  region: values.MEDIA_S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: values.MEDIA_S3_ACCESS_KEY,
    secretAccessKey: values.MEDIA_S3_SECRET_KEY
  }
});

const key = `diagnostics/check-${Date.now()}.txt`;
const expected = `school46-media-check-${Date.now()}`;

try {
  await client.send(new PutObjectCommand({
    Bucket: values.MEDIA_S3_BUCKET,
    Key: key,
    Body: expected,
    ContentType: "text/plain"
  }));
  const response = await client.send(new GetObjectCommand({ Bucket: values.MEDIA_S3_BUCKET, Key: key }));
  const actual = response.Body ? await response.Body.transformToString() : "";
  if (actual !== expected) throw new Error("Uploaded object content did not match");
  console.log("S3 media storage check passed");
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: values.MEDIA_S3_BUCKET, Key: key }));
}
