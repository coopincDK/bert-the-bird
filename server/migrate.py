"""Run the managed Bert schema preparation without starting the HTTP server."""
from server.db import migrate


if __name__ == '__main__':
    migrate()
