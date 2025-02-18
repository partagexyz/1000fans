# featureAI.py
import os
import json
import torch
from transformers import PretrainedConfig, AutoConfig, AutoModelForSequenceClassification
from tempo_detection import tempo_determiner, tempo_nn
import sys

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

def process_audio_files(audio_dir):
    tempo_det = RemoteTempoDeterminer()
    audio_files = [f for f in os.listdir(audio_dir) if f.endswith('.mp3')]

    # Load processed files to avoid re-processing
    processed_files = {}
    processed_files_path = os.path.join(audio_dir, 'processed_files.json')
    if os.path.exists(processed_files_path):
        with open(processed_files_path, 'r') as f:
            processed_files = json.load(f)
    
    print(f"Total number of .mp3 files to process: {len(audio_files)}")

    new_processed_files = {}
    for i, file in enumerate(audio_files, 1):
        file_path = os.path.join(audio_dir, file)
        if file not in processed_files:
            try:
                print(f"Processing file {i}/{len(audio_files)}: {file}")
                # Determine Tempo
                tempo = tempo_det.determine_tempo(song_filepath=file_path)
                print(f"Processed {file} - BPM: {tempo:.0f}")
                with open(os.path.join(audio_dir, f"{os.path.splitext(file)[0]}_bpm.json"), 'w') as f:
                    json.dump({'bpm': tempo}, f)
                # Mark file as processed
                new_processed_files[file] = True
            except Exception as e:
                print(f"Failed to process {file}. Error: {e}")

    # Update the processed files list
    processed_files.update(new_processed_files)
    with open(processed_files_path, 'w') as f:
        json.dump(processed_files, f, indent=2)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python featureAI.py <audio_directory>")
        sys.exit(1)
    process_audio_files(sys.argv[1])