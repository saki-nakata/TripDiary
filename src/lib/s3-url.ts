export function getBucketHostname(): string | undefined {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  return bucket && region ? `${bucket}.s3.${region}.amazonaws.com` : undefined;
}
