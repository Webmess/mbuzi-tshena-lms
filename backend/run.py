#!/usr/bin/env python3
"""Run the Mbudzi Tshena LMS API server."""
import socket
import sys

import uvicorn

PORT = 8000
def port_in_use(port: int) -> bool:
    """True if something (probably a backend started earlier) is already listening on this port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) == 0


if __name__ == "__main__":
    if port_in_use(PORT):
        print(f"\nThe backend is already running on port {PORT} (probably in another terminal).")
        print("Stop that one first with Ctrl + C, then start this one again.\n")
        sys.exit(1)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
        log_level="info",
    )