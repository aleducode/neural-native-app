#!/bin/bash
set -euo pipefail

# Create google-services.json from environment variable if it exists
if [ -n "${GOOGLE_SERVICES_JSON_B64:-}" ]; then
  echo "${GOOGLE_SERVICES_JSON_B64}" | base64 -d > "./google-services.json"
  echo "✅ Created google-services.json from environment variable"
elif [ -f "./android/app/google-services.json" ]; then
  cp "./android/app/google-services.json" "./google-services.json"
  echo "✅ Copied google-services.json from android/app/"
else
  echo "⚠️  Warning: google-services.json not found"
fi
