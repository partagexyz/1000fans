# a python script to extract metadata from a given audio file
import os
from mutagen import File
from mutagen.mp4 import MP4
from mutagen.flac import FLAC
import json
import io
from PIL import Image
import ffmpeg

public_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public')
music_folder = os.path.join(public_folder, 'music')
video_folder = os.path.join(public_folder, 'videos')

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

def extract_audio_metadata(file_path):
    audio = File(file_path)
    
    if isinstance(audio, MP4):
        metadata = {
            'title': audio.get('©nam', ['Unknown'])[0],
            'artist': audio.get('©ART', ['Unknown Artist'])[0],
            'duration': audio.info.length if hasattr(audio.info, 'length') else 'Unknown'
        }
    elif isinstance(audio, FLAC):
        metadata = {
            'title': audio.get('title', ['Unknown'])[0],
            'artist': audio.get('artist', ['Unknown Artist'])[0],
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
        image = f"/music/{os.path.basename(image_path)}"
    else:
        image = "/nocoverfound.jpg"
    
    # Prepare metadata structure
    filename = os.path.basename(file_path)
    id = f"{sanitize_filename(metadata['artist'])} - {sanitize_filename(metadata['title'])}"
    ext = os.path.splitext(filename)[1]
    
    new_file_name = f"{id}{ext}"
    new_file_path = os.path.join(os.path.dirname(file_path), new_file_name)
    # Rename file
    os.rename(file_path, new_file_path)

    # Convert duration to HH:MM:SS if not 'Unknown'
    duration_ms = seconds_to_ms(metadata['duration']) if metadata['duration'] != 'Unknown' else 'Unknown'
    
    return {
        'id': id,
        'title': metadata['title'],
        'artist': metadata['artist'],
        'url': f"/music/{new_file_name}",
        'image': image,
        'duration': duration_ms
    }

def extract_video_metadata(file_path):
    try:
        # use ffmeg to probe the video file
        probe = ffmpeg.probe(file_path)
        video_info = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
        audio_info = next((s for s in probe['streams'] if s['codec_type'] == 'audio'), None)

        filename = os.path.basename(file_path)
        title = os.path.splitext(filename)[0]
        id = sanitize_filename(title)

        metadata = {
            'id': id,
            'title': title,
            'url': f"/videos/{filename}",
            'metadata': {
                'title': title,
                'image': f"/videos/{id}.jpg",
            }
        }

        if video_info:
            metadata['metadata']['duration'] = seconds_to_ms(float(video_info['duration']))
        else:
            metadata['metadata']['duration'] = 'N/A'

        return metadata
    except Exception as e:
        print(f"Error processing video {file_path}: {e}")
        return None

def main():
    audio_metadata = {}
    audio_metadata_path = os.path.join(public_folder, 'audioMetadata.json')

    # delete pre-existing audio metadata file
    if os.path.exists(audio_metadata_path):
        os.remove(audio_metadata_path)

    for root, _, files in os.walk(music_folder):
        for file in files:
            if file.endswith(('.mp3', '.m4a', '.flac', '.wav')):
                file_path = os.path.join(root, file)
                try:
                    file_metadata = extract_audio_metadata(file_path)
                    audio_metadata[os.path.basename(file_path)] = file_metadata
                except Exception as e:
                    print(f"Error processing {file}: {e}")

    # Write metadata to JSON file
    with open(audio_metadata_path, 'w') as f:
        json.dump(audio_metadata, f, indent=2)

    video_metadata = {}
    video_metadata_path = os.path.join(public_folder, 'videoMetadata.json')

    # delete pre-existing metadata file
    if os.path.exists(video_metadata_path):
        os.remove(video_metadata_path)

    for root, _, files in os.walk(video_folder):
        for file in files:
            if file.endswith(('.mp4', '.mov', '.avi')):
                file_path = os.path.join(root, file)
                video_meta = extract_video_metadata(file_path)
                if video_meta: # check if metadata extraction was successful
                    video_metadata[os.path.basename(file_path)] = video_meta

    with open(video_metadata_path, 'w') as f:
        json.dump(video_metadata, f, indent=2)

if __name__ == '__main__':
    main()