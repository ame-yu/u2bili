#!/usr/bin/bash

if [[ $# -eq 0 ]]; then
    echo -n webpage_url:
    read yturl
else
    yturl=$1
fi

youtube-dl $yturl -J > meta.json
youtube-dl $yturl --all-subs -o "downloads/%(id)s.%(ext)s" --exec 'node upload.js'
