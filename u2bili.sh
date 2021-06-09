#!/usr/bin/bash

downloadPath="downloads/"

if [[ $# -eq 0 ]]; then
    read -p "Youtube video URL: " yturl
else
    yturl=$1
fi

vid=`youtube-dl $yturl --get-id`
youtube-dl $yturl -J > "${downloadPath}$vid.json"
youtube-dl $yturl --all-subs -o "${downloadPath}%(id)s.%(ext)s" --exec "node upload.js ${downloadPath}$vid.json"

