"""
BlockFlow API Proxy
Bypasses CORS restrictions for NVIDIA API calls.
Run alongside the web server:  python3 api-proxy.py
Proxies requests to integrate.api.nvidia.com on port 8080.
"""

import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
HOST = '0.0.0.0'
PORT = 8080


class ProxyHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''
        auth = self.headers.get('Authorization', '')

        req = urllib.request.Request(
            API_URL,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': auth,
                'User-Agent': 'BlockFlow/1.0',
            },
            method='POST',
        )

        try:
            with urllib.request.urlopen(req, timeout=70) as upstream:
                data = upstream.read()
                self.send_response(upstream.status)
                self._cors_headers()
                self.send_header('Content-Type', upstream.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(data)
                self.wfile.flush()
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(e.read())
            self.wfile.flush()
        except Exception as e:
            self.send_response(502)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
            self.wfile.flush()

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def log_message(self, fmt, *args):
        print(f'[api-proxy] {args[0]} {args[1]} {args[2]}')


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), ProxyHandler)
    print(f'[api-proxy] Listening on http://{HOST}:{PORT}')
    print(f'[api-proxy] Forwarding POST/OPTIONS to {API_URL}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[api-proxy] Shutting down')
        server.server_close()
