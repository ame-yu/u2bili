#!/usr/bin/bash

for f in downloads/*.vtt; do 
    mv -- "$f" "${f%.vtt}.srt"
done


# find -L . -type f -name "*.vtt" -print0 | while IFS= read -r -d '' FNAME; do
#     mv -- "$FNAME" "${FNAME%.vtt}.srt"
# done

node uploadsubs.js