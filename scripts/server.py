# create an API endpoint with flask that can execute automation.py
from flask import Flask, request, jsonify
import os
import subprocess
import shutil
import tempfile
from werkzeug.utils import secure_filename

app = Flask(__name__)
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'mp3', 'mp4'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/run_automation', methods=['POST'])
def run_automation():
    if 'files' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    
    files = request.files.getlist('files')
    if not files:
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
    
    with tempfile.TemporaryDirectory() as temp_dir:
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(temp_dir, filename))
            else:
                return jsonify({'status': 'error', 'message': f'File {file.filename} has an invalid extension'}), 400

        try:
            # run the automation script
            subprocess.run(['python3', os.path.join(SCRIPTS_DIR, "automation.py"), temp_dir], check=True)
            return jsonify({'status': 'success', 'message': 'Automation completed successfully'}), 200
        except subprocess.CalledProcessError as e:
            return jsonify({'status': 'error', 'message': f'Automation failed: {e}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)