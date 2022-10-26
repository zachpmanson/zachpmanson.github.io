#!/usr/bin/env bash

source ./venv/bin/activate
echo Activated venv
python3 ./generator/ironprof.py
deactivate
echo Deactivated venv
echo Done!