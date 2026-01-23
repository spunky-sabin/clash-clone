#!/bin/bash
# Test the API endpoint directly

echo "Testing API health endpoint..."
curl -s http://localhost:3000/api/health | jq '.'

echo -e "\n\nTesting player API endpoint..."
curl -s "http://localhost:3000/api/player/%23LJYG9VPQY" | jq '.success, .player.name, .player.townHallLevel'

echo -e "\n\nDone!"
