#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${APPWRITE_API_KEY:-}" ]]; then
  echo "APPWRITE_API_KEY is required to apply Appwrite schema." >&2
  exit 1
fi

PROJECT_ID="69bd040e000949b8a413"
ENDPOINT="https://sgp.cloud.appwrite.io/v1"

appwrite client --endpoint "$ENDPOINT" --project-id "$PROJECT_ID" --key "$APPWRITE_API_KEY" >/dev/null
appwrite push tables --all --force

echo "Schema push completed for project ${PROJECT_ID}."
