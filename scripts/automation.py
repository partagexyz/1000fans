# a master script to execute them all 
import os
import subprocess
import sys
import glob

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def run_script(script_name, *args):
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    command = ['python3', script_path] + list(args)
    try:
        print(f"Starting script: {script_name} with args: {args}")
        result = subprocess.run(command, check=True, text=True, capture_output=True)
        print(f"Completed script: {script_name}")
        if result.stdout:
            print(f"Output from {script_name}: {result.stdout}")
        if result.stderr:
            print(f"Errors from {script_name}: {result.stderr}")
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_name}: {e}")
        if e.stderr:
            print(f"Error details: {e.stderr}")
        return False

def main(temp_dir):
    if not glob.glob(os.path.join(temp_dir, '*')):  # Check if there are any files in temp_dir
        print("No files found in the temporary directory. Skipping automation")
        return
    
    print(f"Beginning automation process for directory: {temp_dir}")
    steps = [
        ('featureAI.py', temp_dir),
        ('metadata.py', temp_dir),
        ('upload.py', temp_dir)
    ]
    
    for script, *args in steps:
        print(f"Executing step: {script}")
        if not run_script(script, *args):
            print(f"Script {script} failed for some files but continuing with remaining steps.")
            # continue to next script despite failure
    print("Automation process completed successfully.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 automation.py <temp_directory>")
        sys.exit(1)
    main(sys.argv[1])