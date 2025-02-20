# a python script to extract metadata from a given audio file
import os
from mutagen import File
from mutagen.mp4 import MP4
import json
import io
from PIL import Image
import ffmpeg

def sanitize_filename(s):
    return s.replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')

def extract_embedded_image(audio):
    if isinstance(audio, MP4) and 'covr' in audio:
        return io.BytesIO(audio['covr'][0])
    elif hasattr(audio, 'tags'):
        if 'APIC:' in audio:  # For MP3
            return io.BytesIO(audio['APIC:'].data)
        elif 'METADATA_BLOCK_PICTURE' in audio:  # For FLAC
            return io.BytesIO(audio['METADATA_BLOCK_PICTURE'][0].data)
    return None

def seconds_to_ms(seconds):
    import math
    minutes = math.floor(seconds / 60)
    secs = math.floor(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

def extract_metadata(file_path, file_type, target_dir):
    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()

    if file_type == 'audio' and ext != '.mp3':
        return None
    if file_type == 'video' and ext != '.mp4':
        return None

    print(f"Processing file: {filename}")
    if ext not in ['.mp3', '.mp4']:
        print(f"Skipping unsupported file: {filename}")
        return None
    
    if ext == '.mp3':
        audio = File(file_path)
        metadata = {
            'title': audio.get('TIT2', ['Unknown'])[0] if hasattr(audio, 'get') else 'Unknown',
            'artist': audio.get('TPE1', ['Unknown Artist'])[0] if hasattr(audio, 'get') else 'Unknown Artist',
            'duration': audio.info.length if hasattr(audio.info, 'length') else 'Unknown'
        }

        # Check for BPM before renaming
        temp_metadata_path = os.path.join(target_dir, f"{os.path.splitext(filename)[0]}_bpm.json")
        if os.path.exists(temp_metadata_path):
            with open(temp_metadata_path, 'r') as f:
                temp_metadata = json.load(f)
            if 'bpm' in temp_metadata:
                metadata['bpm'] = temp_metadata['bpm']
            os.remove(temp_metadata_path)
            print(f"Added BPM to metadata for: {filename}")
    
        # Extract cover art
        embedded_image = extract_embedded_image(audio)
        image = "nocoverfound.jpg"
        if embedded_image:
            pil_image = Image.open(embedded_image)
            if pil_image.mode == 'RGBA':
                pil_image = pil_image.convert('RGB')
            image_path = os.path.join(target_dir, f"{sanitize_filename(metadata['artist'])} - {sanitize_filename(metadata['title'])}.jpg")
            pil_image.save(image_path, 'JPEG')
            image = os.path.basename(image_path)
            print(f"Extracted cover art for: {filename}")
    
        # Prepare metadata structure
        id = f"{sanitize_filename(metadata['artist'])} - {sanitize_filename(metadata['title'])}"
        new_file_name = f"{id}{ext}"
        new_file_path = os.path.join(target_dir, new_file_name)
        
        # Ensure target directory exists
        os.makedirs(os.path.dirname(new_file_path) or '.', exist_ok=True)

        if os.path.exists(file_path):
            print(f"Renaming file from {filename} to {new_file_name} in {target_dir}")
            os.rename(file_path, new_file_path)
        else:
            print(f"Error: Source file {filename} not found for renaming")
            return None

        print(f"Renamed file to: {new_file_name}")

        # Convert duration to HH:MM:SS if not 'Unknown'
        duration_ms = seconds_to_ms(metadata['duration']) if metadata['duration'] != 'Unknown' else 'Unknown'

        metadata.update({
            'id': id,
            'url': f"music/{new_file_name}",
            'image': image,
            'duration': duration_ms
        })

        return metadata

    elif ext == '.mp4':
        try:
            probe = ffmpeg.probe(file_path)
            video_info = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
        
            title = os.path.splitext(filename)[0]
            id = sanitize_filename(title)

            new_file_name = filename  # Keep original name for videos
            new_file_path = os.path.join(target_dir, new_file_name)

            # Ensure target directory exists
            os.makedirs(os.path.dirname(new_file_path) or '.', exist_ok=True)

            if os.path.exists(file_path):
                print(f"Moving video file from {filename} to {new_file_name} in {target_dir}")
                os.rename(file_path, new_file_path)
            else:
                print(f"Error: Source video file {filename} not found for moving")
                return None

            metadata = {
                'id': id,
                'title': title,
                'url': f"https://{s3_bucket_name}.s3.amazonaws.com/videos/{filename}",
                'metadata': {
                    'title': title,
                    'image': f"https://{s3_bucket_name}.s3.amazonaws.com/videos/{id}.jpg",
                    'duration': seconds_to_ms(float(video_info['duration'])) if video_info else 'N/A'
                }
            }
            print(f"Extracted metadata for video: {filename}")
            return metadata
        except Exception as e:
            print(f"Error processing video {file_path}: {e}")
            return None

def main(temp_dir):
    print(f"Starting metadata extraction for directory: {temp_dir}")
    new_audio_metadata = {}
    new_video_metadata = {}

    # Create music and videos directories if they don't exist
    audio_dir = os.path.join(temp_dir, 'music')
    video_dir = os.path.join(temp_dir, 'videos')
    os.makedirs(audio_dir, exist_ok=True)
    os.makedirs(video_dir, exist_ok=True)

    # process all files in temp_dir
    processed_files = set()  # Track processed files to avoid re-processing
    for root, _, files in os.walk(temp_dir):
        for file in files:
            if file in processed_files:
                continue
            file_path = os.path.join(root, file)
            if file.endswith('.mp3'):
                metadata = extract_metadata(file_path, 'audio', audio_dir)
                if metadata:
                    new_audio_metadata[file] = metadata
                    processed_files.add(file)
                    processed_files.add(os.path.basename(metadata['url']))
                    print(f"Metadata extracted and saved for audio: {os.path.basename(file_path)}")
            elif file.endswith('.mp4'):
                metadata = extract_metadata(file_path, 'video', video_dir)
                if metadata:
                    new_video_metadata[file] = metadata
                    processed_files.add(file)
                    print(f"Metadata extracted and saved for video: {os.path.basename(file_path)}")

    # Save temporary metadata files
    with open(os.path.join(temp_dir, 'new_audioMetadata.json'), 'w') as f:
        json.dump(new_audio_metadata, f, indent=2)
        print("Saved new audio metadata to new_audioMetadata.json")
    
    with open(os.path.join(temp_dir, 'new_videoMetadata.json'), 'w') as f:
        json.dump(new_video_metadata, f, indent=2)
        print("Saved new video metadata to new_videoMetadata.json")


if __name__ == '__main__':
    import sys
    if len(sys.argv) != 2:
        print("Usage: python metadata.py <temp_directory>")
        sys.exit(1)
    main(sys.argv[1])