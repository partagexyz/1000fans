# featureAI.py
import os
import json
import torch
from transformers import PretrainedConfig
from tempo_detection import tempo_determiner, tempo_nn
import sys
from concurrent.futures import ThreadPoolExecutor
import threading

# Custom Configuration for the tempo detection model
class CustomTempoConfig(PretrainedConfig):
    model_type = "custom_tempo_nn"
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.hidden_size = kwargs.get("hidden_size", 768)

class RemoteTempoDeterminer(tempo_determiner):
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # Load configuration from Hugging Face
        config = CustomTempoConfig.from_pretrained("jcarbonnell/tempo_detection")
        # Initialize the model with the custom configuration
        self.tempo_nn = tempo_nn().to(self.device)  
        # Load model weights from Hugging Face
        state_dict = torch.hub.load_state_dict_from_url(
            f"https://huggingface.co/jcarbonnell/tempo_detection/resolve/main/pytorch_model.bin",
            map_location=self.device
        )
        # Check for nested structure
        if 'model_state_dict' in state_dict:
            state_dict = state_dict['model_state_dict']
        # Load the state dict directly since keys are already in the correct format
        self.tempo_nn.load_state_dict(state_dict)

def process_file(file, audio_dir, processed_files, lock):
    file_path = os.path.join(audio_dir, file)
    if file in processed_files:
        print(f"Skipping already processed file: {file}")
        return file, True

    print(f"Processing file: {file}")
    try:
        tempo = tempo_det.determine_tempo(song_filepath=file_path)
        print(f"Processed {file} - BPM: {tempo:.0f}")
        with open(os.path.join(audio_dir, f"{os.path.splitext(file)[0]}_bpm.json"), 'w') as f:
            json.dump({'bpm': tempo}, f)
        print(f"Saved BPM data for {file}")
        with lock:
            processed_files[file] = True
        return file, True
    except Exception as e:
        print(f"Failed to process {file}. Error: {e}")
        return file, False

def process_audio_files(audio_dir):
    print(f"Starting tempo detection for audio directory: {audio_dir}")
    tempo_det = RemoteTempoDeterminer()
    audio_files = [f for f in os.listdir(audio_dir) if f.endswith('.mp3')]

    # Load processed files to avoid re-processing
    processed_files = {}
    processed_files_path = os.path.join(audio_dir, 'processed_files.json')
    lock = threading.Lock()
    if os.path.exists(processed_files_path):
        with lock:
            with open(processed_files_path, 'r') as f:
                processed_files = json.load(f)
        print(f"Loaded previously processed files from {processed_files_path}")
    
    print(f"Total number of .mp3 files to process: {len(audio_files)}")

    # Process files concurrently
    new_processed_files = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = executor.map(lambda f: process_file(f, audio_dir, processed_files, lock), audio_files)
    
    # Collect results
    for file, success in results:
        if success and file not in processed_files:
            new_processed_files[file] = True

    # Update processed files list with thread safety
    if new_processed_files:
        with lock:
            processed_files.update(new_processed_files)
            with open(processed_files_path, 'w') as f:
                json.dump(processed_files, f, indent=2)
        print(f"Updated processed files list in {processed_files_path}")
    else:
        print("No new files processed; no changes to processed files list.")

    print("Tempo detection process completed for all files.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python featureAI.py <audio_directory>")
        sys.exit(1)
    process_audio_files(sys.argv[1])