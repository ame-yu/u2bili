#!/usr/bin/env bash

# Set save folder here
downloadPath="./downloads/"

if [[ $# -eq 0 ]]; then
    read -r -p "Youtube video URL: " yturl
else
    yturl=$1
fi

mkdir -p $downloadPath
vid=$(yt-dlp "$yturl" --get-id)
yt-dlp "$yturl" -J > "${downloadPath}$vid.json" || exit 0 # exit if prompt event live error
duration=$(cat "${downloadPath}$vid.json"| jq .duration)

# Set max duration here, default is 30min
if [ "$duration" -ge 1800 ]; then
    echo "Video longer than 30 min,skip..."
    exit 0
fi

set -x # Show following commands
yt-dlp "$yturl" --quiet --write-subs --all-subs --embed-subs -o "${downloadPath}%(id)s.%(ext)s" --exec "node upload.js ${downloadPath}$vid.json"