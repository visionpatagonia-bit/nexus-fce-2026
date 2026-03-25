#!/usr/bin/env python3
"""
Servidor local para Portal FCE 2026
Uso: python3 serve.py
Abre: http://localhost:8000
"""
import http.server
import socketserver
import os

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers necesarios para PWA / Service Worker
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  {args[0]} {args[1]}")

print(f"\n  Portal FCE 2026 — servidor local")
print(f"  http://localhost:{PORT}\n")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor detenido.")
