#!/usr/bin/env bash

source ./venv/bin/activate
echo Activated venv
python3 ./templates/process_posts.py
echo Done!