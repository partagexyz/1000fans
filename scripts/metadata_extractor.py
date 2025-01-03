# a python script to extract metadata from a given audio file
import os
import json
from acoustid import fingerprint_file
from mutagen import File
from mutagen.flac import FLAC

ACOUSTID_API_KEY = 'W7Xl2C0NvH'

def extract_metadata(file_path):
    audio_file = File(file_path)

    metadata = {
        'id': os.path.basename(file_path).split('.')[0],
        'title': audio_file.get('TIT2', [None])[0] if audio_file else None,
        'artist': audio_file.get('TPE1', [None])[0] if audio_file else None,
        'url': '/music/' + os.path.basename(file_path),
    }

    # handle cover art for different formats
    if audio_file:
        if hasattr(audio_file, 'tags'):
            cover = audio_file.tags.get('APIC:', None) # for mp3  
            if cover is None: 
                cover = audio_file.tags.get('covr', None) # for m4a
        elif isinstance(audio_file, FLAC):
            cover = audio_file.pictures[0] if audio_file.pictures else None # for flac
        else:
            cover = None # for other formats including ogg, wav, etc

        if cover:
            metadata['image'] = '/music/' + os.path.basename(file_path).replace(os.path.splitext(file_path)[1], '.png')

    return metadata

def fetch_acoustid_metadata(file_path):
    try:
        results = fingerprint_file(ACOUSTID_API_KEY, file_path, force_fpcalc=True)
        for score, rid, title, artist in results:
            if title and artist:
                return {
                    'title': title,
                    'artist': artist
                }
    except Exception as e:
        print(f"Error fetching AcoustID data: {e}")
    return None

def main():
    metadata_file = 'metadata.json'
    metadata = {}

    # try to read metadata from the file, if it exists
    if os.path.exists(metadata_file):
        try:
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        except json.JSONDecodeError:
            print("Failed to load existing metadata; starting with empty metadata.")
        except Exception as e:
            print(f"Error loading metadata: {e}")

    for filename in os.listdir('../public/music'):
        if filename.endswith(('.mp3', '.m4a', '.flac', '.wav')) and filename not in metadata:
            file_path = os.path.join('../public/music', filename)
            try:
                file_metadata = extract_metadata(file_path)

                # check for keys that are missing
                if not file_metadata.get('title') or not file_metadata.get('artist'):
                    acoustid_metadata = fetch_acoustid_metadata(file_path)
                    if acoustid_metadata:
                        file_metadata.update(acoustid_metadata)

                metadata[filename] = file_metadata
            except Exception as e:
                print(f"Error processing {filename}: {e}")

    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)

if __name__ == '__main__':
    main()