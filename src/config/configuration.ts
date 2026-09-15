export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    imagesBucket: process.env.S3_BUCKET_IMAGES ?? 'deborix-images',
    logsBucket: process.env.S3_BUCKET_LOGS ?? 'deborix-log',
  },
});
