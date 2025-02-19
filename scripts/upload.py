import os
import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from datetime import datetime, timezone
import json

# fetch AWS credentials from environment variables
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_S3_BUCKET_NAME = os.environ.get('AWS_S3_BUCKET_NAME')

# check if keys are present
if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET_NAME:
    raise ValueError('AWS credentials or bucket not found')

# initialise S3 client
s3 = boto3.client('s3', 
                  aws_access_key_id=AWS_ACCESS_KEY_ID, 
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

transfer_config = TransferConfig(multipart_threshold=1024*1024*5,  # 5MB threshold for multipart upload
                                 multipart_chunksize=1024*1024*5,  # 5MB chunk size
                                 max_concurrency=10,  # Number of threads for concurrent upload
                                 use_threads=True)

def download_file(bucket, object_name, local_path):
    """Download a file from S3 to local path, creating directory if needed."""
    os.makedirs(os.path.dirname(local_path) or '.', exist_ok=True)
    try:
        s3.download_file(bucket, object_name, local_path)
        print(f"Successfully downloaded {object_name} from S3 to {local_path}")
        return True
    except ClientError as e:
        if e.response['Error']['Code'] != '404':
            print(f"Failed to download {object_name} from S3: {e}")
        return False

def merge_metadata(existing, new):
    """Merge new metadata with existing metadata, avoiding duplicates based on 'id'."""
    result = existing.copy()
    for key, value in new.items():
        if value['id'] not in [item['id'] for item in result.values() if 'id' in item]:
            result[key] = value
            print(f"Added new metadata for: {value['id']}")
        else:
            # Update existing entry if needed (e.g., new duration or BPM)
            for existing_key, existing_value in list(result.items()):
                if existing_value['id'] == value['id']:
                    result[existing_key] = value  # Update with new data
                    print(f"Updated metadata for existing file: {value['id']}")
                    break
    return result

def upload_file(file_path, bucket, object_name=None):
    """Upload a file to an S3 bucket, skipping if S3 version is newer."""
    if object_name is None:
        object_name = os.path.basename(file_path)

    print(f"Checking file for upload: {object_name}")
    # Get local file's last modified time and make it timezone aware
    local_last_modified = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)
    
    try:
        # Check if the file already exists in S3
        s3_object = s3.head_object(Bucket=bucket, Key=object_name)
        s3_last_modified = s3_object['LastModified']
        
        if s3_last_modified > local_last_modified:
            print(f"Skipping {object_name} as the S3 version is newer or equal.")
            return True
        else:
            print(f"Uploading {object_name} as the local version is newer.")
            s3.upload_file(file_path, bucket, object_name, Config=transfer_config)
            print(f"Successfully uploaded {object_name}")
            return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            print(f"Uploading new file: {object_name}")
            # if file does not exist, proceed with upload
            try:
                print(f"Uploading new file: {object_name}")
                s3.upload_file(file_path, bucket, object_name, Config=transfer_config)
                print(f"Successfully uploaded {object_name}")
                return True
            except Exception as e:
                print(f"Failed to upload {object_name}: {e}")
                return False
        else:
            # An error occurred that wasn't a 404 (File not found)
            print(f"Unexpected error when checking for {object_name}: {e}")
            return False
'''
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
'''
# upload audio and video files
def upload_directory(bucket_name, local_directory, s3_prefix=''):
    """Upload all files from a local directory to an S3 bucket with the given prefix."""
    print(f"Starting upload from directory: {local_directory} to S3 prefix: {s3_prefix}")
    for root, _, files in os.walk(local_directory):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_directory)
            s3_path = os.path.join(s3_prefix, relative_path).replace('\\', '/')
            if not upload_file(local_path, bucket_name, s3_path):
                print(f"Failed to upload {local_path} to S3. Continuing with next file.")

def upload_metadata_files(bucket_name, local_directory):
    """Download existing, merge with new, and upload metadata files."""
    metadata_types = {
        'audio': ('new_audioMetadata.json', 'audioMetadata.json'),
        'video': ('new_videoMetadata.json', 'videoMetadata.json')
    }

    for meta_type, (new_file, existing_s3_key) in metadata_types.items():
        local_new_path = os.path.join(local_directory, new_file)
        local_existing_path = os.path.join(local_directory, existing_s3_key)

        print(f"Processing metadata for {meta_type}: {new_file}")
        # Download existing metadata if it exists
        existing_metadata = {}
        if not download_file(bucket_name, existing_s3_key, local_existing_path):
            print(f"No existing {existing_s3_key} found in S3, starting fresh.")

        # Load existing and new metadata
        if os.path.exists(local_existing_path):
            with open(local_existing_path, 'r') as f:
                existing_metadata = json.load(f)
            print(f"Loaded existing {meta_type} metadata from {local_existing_path}")
        else:
            existing_metadata = {}

        if os.path.exists(local_new_path):
            with open(local_new_path, 'r') as f:
                new_metadata = json.load(f)
            print(f"Loaded new {meta_type} metadata from {local_new_path}")

            # Merge metadata
            merged_metadata = merge_metadata(existing_metadata, new_metadata)
            print(f"Merged {meta_type} metadata successfully")

            # Save merged metadata locally
            with open(local_existing_path, 'w') as f:
                json.dump(merged_metadata, f, indent=2)
            print(f"Saved merged {meta_type} metadata to {local_existing_path}")

            # Upload merged metadata to S3
            if not upload_file(local_existing_path, bucket_name, existing_s3_key):
                print(f"Failed to upload merged {existing_s3_key} to S3.")
            else:
                print(f"Successfully uploaded merged {existing_s3_key} to S3")
        else:
            print(f"No new {new_file} found, skipping merge.")

def main(temp_dir):
    print(f"Starting S3 upload process for directory: {temp_dir}")
    # Upload content files (audio and video)
    audio_dir = os.path.join(temp_dir, 'music')
    video_dir = os.path.join(temp_dir, 'videos')
    upload_directory(AWS_S3_BUCKET_NAME, audio_dir, 'music/')
    upload_directory(AWS_S3_BUCKET_NAME, video_dir, 'videos/')

    # Handle metadata merging and uploading
    upload_metadata_files(AWS_S3_BUCKET_NAME, temp_dir)
    print("S3 upload process completed.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python upload.py <temp_directory>")
        sys.exit(1)
    main(sys.argv[1])