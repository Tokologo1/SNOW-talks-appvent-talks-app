import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Fetch the feed
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse the XML
        root = ET.fromstring(response.content)
        
        # Atom namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            title_text = title.text if title is not None else 'Unknown Date'
            
            updated = entry.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ''
            
            id_elem = entry.find('atom:id', ns)
            id_text = id_elem.text if id_elem is not None else ''
            
            # Find the alternate link
            link_url = ''
            for link in entry.findall('atom:link', ns):
                if link.get('rel') == 'alternate' or not link.get('rel'):
                    link_url = link.get('href', '')
                    break
            
            content = entry.find('atom:content', ns)
            content_html = content.text if content is not None else ''
            
            entries.append({
                'title': title_text,
                'updated': updated_text,
                'id': id_text,
                'link': link_url,
                'content': content_html
            })
            
        return jsonify({'status': 'success', 'data': entries})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Running on local port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
