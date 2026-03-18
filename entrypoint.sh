#!/bin/bash
set -e

echo "=== MapleStory Archive Entrypoint ==="

# Restore DB from backup if missing
if [ ! -f /app/data/maple.db ] && [ -f /app/data-backup/maple.db ]; then
    echo "Restoring database from backup..."
    mkdir -p /app/data
    cp /app/data-backup/maple.db /app/data/maple.db
    echo "Database restored."
fi

# Seed if DB is empty or missing
if [ ! -f /app/data/maple.db ]; then
    echo "No database found. Running seed..."
    python main.py seed
    echo "Seed complete."
fi

# Show status
python main.py status

echo "=== Starting server ==="
exec uvicorn api.server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
