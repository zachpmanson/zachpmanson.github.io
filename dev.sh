#!/usr/bin/env bash
python3 -m http.server &
watchman-make -p '**/*.jinja' '**/*.py' '**/*.md' '**/*.css' -r 'clear; ./build.sh'
trap 'kill $(jobs -p)' EXIT
