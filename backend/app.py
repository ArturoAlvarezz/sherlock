#!/usr/bin/env python3
"""Sherlock OSINT API Backend"""

import subprocess
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "sherlock-backend"})


@app.route('/api/search', methods=['POST'])
def search():
    """Execute Sherlock search with --json output"""
    data = request.get_json()
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    try:
        # Run sherlock with --json flag
        cmd = ['sherlock', username, '--json', '--timeout', '10']
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        # Parse JSON output
        output = result.stdout
        
        # Extract JSON from output (Sherlock outputs JSON mixed with other text)
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
        if json_match:
            try:
                sherlock_data = json.loads(json_match.group())
                return jsonify({
                    "username": username,
                    "results": sherlock_data,
                    "found": len([v for v in sherlock_data.values() if v.get('exists')])
                })
            except json.JSONDecodeError:
                pass
        
        # Fallback: parse text output
        return jsonify({
            "username": username,
            "raw_output": output,
            "error": result.stderr if result.stderr else None
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Search timeout"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/sites', methods=['GET'])
def list_sites():
    """List supported sites"""
    try:
        result = subprocess.run(
            ['sherlock', '--list-all-sites'],
            capture_output=True,
            text=True,
            timeout=30
        )
        sites = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        return jsonify({"sites": sites, "count": len(sites)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
