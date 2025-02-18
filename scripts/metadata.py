# a python script to extract metadata from a given audio file
import os
from mutagen import File
from mutagen.mp4 import MP4
import json
import io
from PIL import Image
import ffmpeg

# Fetch environment variables for S3 bucket name
s3_bucket_name = os.environ.get('AWS_S3_BUCKET_NAME', 'your-default-bucket-name') #check for the need to add a default bucket name

def sanitize_filename(s):
    # Function to sanitize string for file names
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

def extract_metadata(file_path):
    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()

    if ext == '.mp3':
        audio = File(file_path)

        metadata = {
            'title': 'Unknown',
            'artist': 'Unknown Artist',
            'duration': 'Unknown'
        }
    
        if isinstance(audio, MP4):
            metadata = {
                'title': audio.get('©nam', ['Unknown'])[0],
                'artist': audio.get('©ART', ['Unknown Artist'])[0],
                'duration': audio.info.length if hasattr(audio.info, 'length') else 'Unknown'
            }
        else:  # Assume MP3 or other formats with ID3 tags
            metadata = {
                'title': audio.get('TIT2', ['Unknown'])[0],
                'artist': audio.get('TPE1', ['Unknown Artist'])[0],
                'duration': audio.info.length if hasattr(audio.info, 'length') else 'Unknown'
            }
    
        # Extract cover art
        embedded_image = extract_embedded_image(audio)
        if embedded_image:
            pil_image = Image.open(embedded_image)
            if pil_image.mode == 'RGBA':
                pil_image = pil_image.convert('RGB')
        
            image_path = os.path.join(os.path.dirname(file_path), f"{sanitize_filename(metadata['artist'])} - {sanitize_filename(metadata['title'])}.jpg")
            pil_image.save(image_path, 'JPEG')
            image = f"https://{s3_bucket_name}.s3.amazonaws.com/music/{os.path.basename(image_path)}"
        else:
            image = f"https://{s3_bucket_name}.s3.amazonaws.com/nocoverfound.jpg"
    
        # Prepare metadata structure
        id = f"{sanitize_filename(metadata['artist'])} - {sanitize_filename(metadata['title'])}"
        new_file_name = f"{id}{ext}"
        new_file_path = os.path.join(os.path.dirname(file_path), new_file_name)
        os.rename(file_path, new_file_path)

        # Convert duration to HH:MM:SS if not 'Unknown'
        duration_ms = seconds_to_ms(metadata['duration']) if metadata['duration'] != 'Unknown' else 'Unknown'

        metadata.update({
            'id': id,
            'url': f"https://{s3_bucket_name}.s3.amazonaws.com/music/{new_file_name}",
            'image': image,
            'duration': duration_ms
        })

        # Load temporary metadata for BPM and Key
        temp_metadata_path = os.path.join(os.path.dirname(new_file_path), f"{os.path.splitext(filename)[0]}_bpm.json")
        if os.path.exists(temp_metadata_path):
            with open(temp_metadata_path, 'r') as f:
                temp_metadata = json.load(f)
            if 'bpm' in temp_metadata:
                metadata['bpm'] = temp_metadata['bpm']
            # Clean up temp file
            os.remove(temp_metadata_path)

        return metadata

    elif ext == '.mp4':
        try:
            # use ffmeg to probe the video file
            probe = ffmpeg.probe(file_path)
            video_info = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
        
            title = os.path.splitext(filename)[0]
            id = sanitize_filename(title)

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

            return metadata
        except Exception as e:
            print(f"Error processing video {file_path}: {e}")
            return None
        
    else:
        print(f"Unsupported file format: {ext}")
        return None

def main(temp_dir):
    metadata = {}
    for root, _, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            file_metadata = extract_metadata(file_path)
            if file_metadata:
                    metadata[os.path.basename(file_path)] = file_metadata

    # Write metadata to JSON files
    audio_metadata = {k: v for k, v in metadata.items() if 'music' in v.get('url', '')}
    video_metadata = {k: v for k, v in metadata.items() if 'videos' in v.get('url', '')}

    # Write metadata to JSON file
    with open(os.path.join(temp_dir, 'audioMetadata.json'), 'w') as f:
        json.dump(audio_metadata, f, indent=2)

    with open(os.path.join(temp_dir, 'videoMetadata.json'), 'w') as f:
        json.dump(video_metadata, f, indent=2)

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 2:
        print("Usage: python metadata.py <temp_directory>")
        sys.exit(1)
    main(sys.argv[1])