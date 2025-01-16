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

# Local file path where the chat history will be saved
LOCAL_CHAT_HISTORY_PATH = os.path.join(os.path.dirname(__file__), 'chatHistory.json')

def fetch_chat_history():
    """
    Fetches the chat history from S3 and saves it locally.
    """
    try:
        # Download the JSON file from S3
        s3.download_file(AWS_S3_BUCKET_NAME, CHAT_HISTORY_S3_PATH, LOCAL_CHAT_HISTORY_PATH)
        print("Chat history fetched and saved locally.")
    except Exception as e:
        print(f"Failed to fetch chat history: {e}")

def save_chat_history(chat_data):
    """
    Saves the new chat data to local file and then uploads it to S3.

    :param chat_data: New chat data to be appended to the history
    """
    try:
        # First, read the existing chat history if it exists
        if os.path.exists(LOCAL_CHAT_HISTORY_PATH):
            with open(LOCAL_CHAT_HISTORY_PATH, 'r') as file:
                current_data = json.load(file)
        else:
            current_data = {}

        # Append new chat data
        current_data.update(chat_data)

        # Write updated data back to the local file
        with open(LOCAL_CHAT_HISTORY_PATH, 'w') as file:
            json.dump(current_data, file, indent=4)

        # Upload the updated file to S3
        s3.upload_file(LOCAL_CHAT_HISTORY_PATH, AWS_S3_BUCKET_NAME, CHAT_HISTORY_S3_PATH)
        print("Chat history saved and updated in S3.")
    except Exception as e:
        print(f"Failed to save chat history: {e}")

def on_chat_widget_open():
    """
    Function to be called when chat widget opens. Fetches the latest chat history.
    """
    fetch_chat_history()

def on_message_sent(chat_data):
    """
    Function to be called when a message is sent. Updates and saves the chat history.

    :param chat_data: Dictionary containing the new message data
    """
    save_chat_history(chat_data)

# Example usage:
if __name__ == "__main__":
    # Simulating chat widget open
    on_chat_widget_open()