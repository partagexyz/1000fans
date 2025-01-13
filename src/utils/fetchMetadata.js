import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ 
    region: 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
});

/**
 * Fetches metadata from S3. Returns parsed JSON or null if there's an error.
 * @param {string} bucket - The name of the S3 bucket
 * @param {string} key - The key of the object in the bucket
 * @returns {Promise<Object|null>}
 */
export const fetchFileFromS3 = async (bucket, key) => {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await s3Client.send(command);
      return JSON.parse(await response.Body.transformToString());
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.error(`File ${key} not found in bucket ${bucket}`);
      } else if (error.name === 'NoSuchKey') {
        console.error(`Key ${key} does not exist in bucket ${bucket}`);
      } else {
        console.error(`Error fetching ${key}:`, error);
      }
      return null;
    }
  };