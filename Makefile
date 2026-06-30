.PHONY: build css dev install

build:
	uv run ./generator/ironprof.py
	$(MAKE) css

css:
	./tailwindcss -m -i styles/global.css -o styles/global-tw.css

install:
	uv sync

dev:
	uv run python -m http.server & \
	watchman-make -p '**/*.jinja' '**/*.py' '**/*.md' '**/*.css' -r 'clear; $(MAKE) build'; \
	trap 'kill $$(jobs -p)' EXIT
