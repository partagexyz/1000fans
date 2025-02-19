# create an API endpoint with flask that can execute automation.py
from flask import Flask, request, jsonify
import os
import subprocess
import shutil
import tempfile
import logging
from werkzeug.utils import secure_filename

app = Flask(__name__)
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
status_updates = []

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'mp3', 'mp4'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/run_automation', methods=['POST'])
def run_automation():
    global status_updates
    status_updates = []

    if 'files' not in request.files:
        logger.error('No file part in request')
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    
    files = request.files.getlist('files')
    if not files:
        logger.error('No files selected')
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
    
    with tempfile.TemporaryDirectory() as temp_dir:
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(temp_dir, filename))
                status_updates.append(f"Received file: {filename}")
            else:
                status_updates.append(f"Invalid file skipped: {file.filename}")
                logger.error(f'Invalid file: {file.filename}')
                return jsonify({'status': 'error', 'message': f'File {file.filename} has an invalid extension'}), 400

        try:
            # Run automation script and capture its output
            process = subprocess.run(['python3', os.path.join(SCRIPTS_DIR, "automation.py"), temp_dir], 
                                    check=True, capture_output=True, text=True)
            status_updates.extend(process.stdout.splitlines())
            if process.stderr:
                status_updates.extend([f"Error: {line}" for line in process.stderr.splitlines()])
                logger.error('Automation failed: %s', process.stderr)
                return jsonify({'status': 'error', 'message': f'Automation failed: {process.stderr}'}), 500

            logger.info('Automation completed successfully for files in %s', temp_dir)
            return jsonify({'status': 'success', 'message': 'Automation completed successfully'}), 200
        except subprocess.CalledProcessError as e:
            status_updates.append(f"Automation failed: {e.stderr}")
            logger.error('Automation failed: %s', e.stderr)
            return jsonify({'status': 'error', 'message': f'Automation failed: {e.stderr}'}), 500

@app.route('/api/upload_status', methods=['GET'])
def get_upload_status():
    return jsonify({'status': status_updates})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)