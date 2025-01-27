import os
import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from datetime import datetime, timezone

# fetch AWS credentials from environment variables
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_S3_BUCKET_NAME = os.environ.get('AWS_S3_BUCKET_NAME')

# check if keys are present
if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
    raise ValueError('AWS credentials not found')

# initialise S3 client
s3 = boto3.client('s3', 
                  aws_access_key_id=AWS_ACCESS_KEY_ID, 
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

transfer_config = TransferConfig(multipart_threshold=1024*1024*5,  # 5MB threshold for multipart upload
                                 multipart_chunksize=1024*1024*5,  # 5MB chunk size
                                 max_concurrency=10,  # Number of threads for concurrent upload
                                 use_threads=True)

def upload_file(file_path, bucket, object_name=None):
    """Upload a file to an S3 bucket

    :param file_path: File to upload
    :param bucket: Bucket to upload to
    :param object_name: S3 object name. If not specified, file_name is used
    :return: True if file was uploaded, else False
    """
    if object_name is None:
        object_name = os.path.basename(file_path)

    # Get local file's last modified time and make it timezone aware
    local_last_modified = os.path.getmtime(file_path)
    local_last_modified_dt = datetime.fromtimestamp(local_last_modified, tz=timezone.utc)
    
    try:
        # Check if the file already exists in S3
        s3_object = s3.head_object(Bucket=bucket, Key=object_name)
        s3_last_modified = s3_object['LastModified']
        
        if s3_last_modified > local_last_modified_dt:
            print(f"Skipping {file_path} as the S3 version is newer or equal.")
            return True
        else:
            print(f"Uploading {file_path} as the local version is newer.")
            s3.upload_file(file_path, bucket, object_name, Config=transfer_config)
            return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            # File does not exist, proceed with upload
            try:
                s3.upload_file(file_path, bucket, object_name)
                print(f"Successfully uploaded {file_path} to {bucket}/{object_name}")
                return True
            except Exception as e:
                print(f"Failed to upload {file_path} to {bucket}/{object_name}: {e}")
                return False
        else:
            # An error occurred that wasn't a 404 (File not found)
            print(f"Unexpected error when checking for existence of {file_path}: {e}")
            return False
        
def delete_s3_files(bucket_name, local_directory, s3_prefix):
    """Delete files from S3 that are no longer in the local directory."""
    s3 = boto3.client('s3')
    s3_objects = s3.list_objects_v2(Bucket=bucket_name, Prefix=s3_prefix)
    
    if 'Contents' in s3_objects:
        for obj in s3_objects['Contents']:
            if not obj['Key'].endswith('/'):  # Avoid deleting "directories"
                relative_path = obj['Key'].replace(s3_prefix, '')
                local_path = os.path.join(local_directory, relative_path)
                if not os.path.exists(local_path):
                    s3.delete_object(Bucket=bucket_name, Key=obj['Key'])
                    print(f"Deleted {obj['Key']} from S3 as it does not exist locally")
    
# upload audio and video files
def upload_directory(bucket_name, local_directory, s3_prefix=''):
    """Upload all files from a local directory to an S3 bucket

    :param bucket_name: Name of the S3 bucket
    :param local_directory: Path to the local directory
    :param s3_prefix: Prefix for S3 objects (e.g., 'music/' or 'video/')
    """
    # First, delete files from S3 that no longer exist locally
    delete_s3_files(bucket_name, local_directory, s3_prefix)

    for root, _, files in os.walk(local_directory):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_directory)
            s3_path = os.path.join(s3_prefix, relative_path).replace('\\', '/')
            upload_file(local_path, bucket_name, s3_path)

def upload_metadata_files(bucket_name, local_directory):
    """Upload specific metadata files from the local directory to an S3 bucket

    :param bucket_name: Name of the S3 bucket
    :param local_directory: Path to the local directory containing metadata files
    """
    metadata_files = ['audioMetadata.json', 'videoMetadata.json', 'eventsMetadata.json']
    for meta_file in metadata_files:
        local_path = os.path.join(local_directory, meta_file)
        if os.path.exists(local_path):
            # Always upload metadata files
            s3.upload_file(local_path, bucket_name, meta_file, Config=transfer_config)
            print(f"Successfully uploaded {meta_file} to {bucket_name}/{meta_file}")

if __name__ == "__main__":
    # Upload Music files
    upload_directory(AWS_S3_BUCKET_NAME, '../frontend/public/music', 'music/')

    # Upload Video files
    upload_directory(AWS_S3_BUCKET_NAME, '../frontend/public/videos', 'videos/')

    # Upload metadata files
    upload_metadata_files(AWS_S3_BUCKET_NAME, '../frontend/public')