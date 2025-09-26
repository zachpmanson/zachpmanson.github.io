#!/usr/bin/env bash

source ./venv/bin/activate
echo Activated venv
python3 ./generator/ironprof.py
deactivate
echo Deactivated venv
./tailwindcss -m -i styles/global.css -o styles/global-tw.css
echo Done!