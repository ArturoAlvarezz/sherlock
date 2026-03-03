import json
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Importar Sherlock como librería
try:
    from sherlock.sherlock import sherlock
    from sherlock.notify import QueryNotify
except ImportError:
    pass

app = Flask(__name__)
CORS(app)

@app.route('/search', methods=['POST'])
def search_username():
    data = request.get_json()
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({'error': 'Username requerido'}), 400
    
    try:
        # Usar Sherlock como librería Python
        import requests
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        # Lista de sitios básicos para verificar
        sites = {
            'GitHub': f'https://github.com/{username}',
            'Twitter': f'https://twitter.com/{username}',
            'Instagram': f'https://www.instagram.com/{username}/',
            'Reddit': f'https://www.reddit.com/user/{username}',
            'YouTube': f'https://www.youtube.com/@{username}',
            'Twitch': f'https://www.twitch.tv/{username}',
            'LinkedIn': f'https://www.linkedin.com/in/{username}',
            'TikTok': f'https://www.tiktok.com/@{username}',
        }
        
        results = []
        
        def check_site(site_name, url):
            try:
                response = requests.head(url, allow_redirects=True, timeout=5)
                exists = response.status_code == 200
                return {
                    'platform': site_name,
                    'url': url,
                    'exists': exists,
                    'username': username
                }
            except:
                return {
                    'platform': site_name,
                    'url': url,
                    'exists': False,
                    'username': username
                }
        
        # Verificar sitios en paralelo
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(check_site, name, url): name 
                      for name, url in sites.items()}
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        return jsonify({
            'username': username,
            'results': results,
            'count': len(results),
            'found_count': len([r for r in results if r['exists']])
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'sherlock-backend'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
