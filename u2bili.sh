#!/usr/bin/env bash

downloadPath="./downloads/"

if [[ $# -eq 0 ]]; then
    read -p "Youtube video URL: " yturl
else
    yturl=$1
fi

mkdir -p $downloadPath
vid=$(yt-dlp $yturl --get-id)
yt-dlp $yturl -J > "${downloadPath}$vid.json"
duration=$(cat "${downloadPath}$vid.json"| jq .duration)

# Not too long. 
if [ $duration -ge 1800 ]; then
    echo "Video longer than 30 min,skip..."
    exit 0 #success
fi

set -x #Show command
yt-dlp $yturl $FORMAT --all-subs --embed-subs -o "${downloadPath}%(id)s.%(ext)s" --exec "node upload.js ${downloadPath}$vid.json"