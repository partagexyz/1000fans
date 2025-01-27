import json
import os
import boto3

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

# File path in S3 bucket
CHAT_HISTORY_S3_PATH = 'chatHistory.json'

def fetch_chat_history():
    """
    Fetches the chat history from S3.
    """
    try:
        response = s3.get_object(Bucket=AWS_S3_BUCKET_NAME, Key=CHAT_HISTORY_S3_PATH)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except Exception as e:
        print(f"Failed to fetch chat history: {e}")
        return []

def save_chat_history(new_message):
    """
    Saves a new message to S3.

    :param new_message: Dictionary containing the new message data
    """
    try:
        current_history = fetch_chat_history()
        current_history.append(new_message)
        
        s3.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=CHAT_HISTORY_S3_PATH,
            Body=json.dumps(current_history, indent=4),
            ContentType='application/json'
        )
        print("Chat history updated in S3.")
    except Exception as e:
        print(f"Failed to save chat history: {e}")

# Example usage:
if __name__ == "__main__":
    # Simulating message send
    new_message = {
        "username": "jcarbonnell",
        "message": "Hello, World!",
        "timestamp": "2025-01-27 14:17:00"
    }
    save_chat_history(new_message)

    # Simulating chat widget open
    print(fetch_chat_history())