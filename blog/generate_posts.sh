#!/usr/bin/env bash

nonposts=("styles/", "templates/")

for d in */; do
	echo "$d"
	if ! [[ ${nonposts[*]} =~ $d ]]; then
		echo "is post"
		echo "generating index.html"
		name=$(echo "$d" | sed 's/.$//')
		echo "pandoc ${d}${name}.md -o ${d}index.html --to=html5 --wrap=none --template=templates/template.html"
		pandoc ${d}${name}.md -o ${d}index.html --to=html5 --template=templates/template.html
	fi
done
echo "done"
