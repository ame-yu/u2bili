#!/usr/bin/env bash

downloadPath="./downloads/"

if [[ $# -eq 0 ]]; then
    read -p "Youtube video URL: " yturl
else
    yturl=$1
fi

mkdir -p $downloadPath
vid=`youtube-dl $yturl --get-id`
youtube-dl $yturl -J > "${downloadPath}$vid.json"
filesize=`cat "${downloadPath}$vid.json"| jq .formats[-3].filesize`
duration=`cat "${downloadPath}$vid.json"| jq .duration`

# Not too long. 
if [ $duration -ge 1800 ]; then
    echo "Video longer than 30 min,skip..."
    exit 0 #success
fi

# Not too big. cuz https://github.com/microsoft/playwright/issues/3768
if [ $filesize -ge 314572800 ]; then
    # If best quality video size over 300M, use 720p instead
    FORMAT="-f 22"
fi

set -x #Show command
youtube-dl $yturl $FORMAT -q --all-subs --embed-subs -o "${downloadPath}%(id)s.%(ext)s" --exec "node upload.js ${downloadPath}$vid.json"