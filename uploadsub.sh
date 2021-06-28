#!/usr/bin/env bash

for f in downloads/*.vtt; do 
    mv -- "$f" "${f%.vtt}.srt"
done

node uploadsubs.js