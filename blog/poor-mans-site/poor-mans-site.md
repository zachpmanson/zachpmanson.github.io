---
title: The Poor Man's Static Site Generator
subtitle: Using Pandoc to well below its fullest potential!
tagline: Using Pandoc to well below its fullest potential!
date: 2022-06-11
---

[Pandoc](https://pandoc.org/) is a Swiss Army knife that I exclusively use to cut cheese.

Every time I begin to write for this site, I open Codium and create a new file in my repo. Then I realise I meant to create a new folder, call myself an idiot and start over. This is the first step of my process, which currently concludes with running my anemic static site generator. I hope to soon replace with this a bespoke and iron proficient(?) site generator, but until then I will continue using Pandoc to fulfill my static site generator requirements.

My static site generator requirements:

- Markdown input
- Code highlighting
  - with theming?
- Simple templating
- Minimum (ideally 0) dependencies
- Automated?

## Markdown Input

It can convert documents between myriad formats, most relevantly Markdown to HTML.

```bash
pandoc inputfile.md -o output.html --to=html5
```

## Code Highlighting

There are plenty of tools that can do this, but Pandoc was the first I found that had code highlighting without having any depedencies like [highlight.js](https://highlightjs.org/), just saving the colour information in inline CSS

Any fenced Markdown code blocks with a language specified (like the following) will have the syntax automatically highlighted by Pandoc.

````Markdown
# Title

## Subtitle

Lorem ipsum amirite.  Hey look a fenced code block:

```Python
if x == 5:
    print("x is equal to 5")
```
````

Pandoc will turn this Markdown into the following HTML:

```HTML
<h1 id="title">Title</h1>
<h2 id="subtitle">Subtitle</h2>
<p>Lorem ipsum amirite. Hey look a fenced code block:</p>
<div class="sourceCode" id="cb3"><pre class="sourceCode python"><code class="sourceCode python"><span id="cb3-1"><a href="#cb3-1" aria-hidden="true" tabindex="-1"></a><span class="cf">if</span> x <span class="op">==</span> <span class="dv">5</span>:</span>
<span id="cb3-2"><a href="#cb3-2" aria-hidden="true" tabindex="-1"></a>    <span class="bu">print</span>(<span class="st">"x is equal to 5"</span>)</span></code></pre></div>
```

The various HTML tag class spaghetti are used to highlight the code, though the CSS required to actually make this work is not included in the standard Pandoc command invocation. To actually generate the CSS that makes these classes work you need to use the `--standalone` flag, à la:

```bash
pandoc inputfile.md -o output.html --to=html5 --standalone
```

This will include some inline CSS, along the lines of:

```CSS
code span.al { color: #ff0000; font-weight: bold; } /* Alert */
code span.an { color: #60a0b0; font-weight: bold; font-style: italic; } /* Annotation */
code span.at { color: #7d9029; } /* Attribute */
code span.bn { color: #40a070; } /* BaseN */
code span.bu { } /* BuiltIn */
code span.cf { color: #007020; font-weight: bold; } /* ControlFlow */
code span.ch { color: #4070a0; } /* Char */
code span.cn { color: #880000; } /* Constant */
code span.co { color: #60a0b0; font-style: italic; } /* Comment */
code span.cv { color: #60a0b0; font-weight: bold; font-style: italic; } /* CommentVar */
code span.do { color: #ba2121; font-style: italic; } /* Documentation */
code span.dt { color: #902000; } /* DataType */
code span.dv { color: #40a070; } /* DecVal */
code span.er { color: #ff0000; font-weight: bold; } /* Error */
code span.ex { } /* Extension */
code span.fl { color: #40a070; } /* Float */
code span.fu { color: #06287e; } /* Function */
code span.im { } /* Import */
code span.in { color: #60a0b0; font-weight: bold; font-style: italic; } /* Information */
code span.kw { color: #007020; font-weight: bold; } /* Keyword */
code span.op { color: #666666; } /* Operator */
code span.ot { color: #007020; } /* Other */
code span.pp { color: #bc7a00; } /* Preprocessor */
code span.sc { color: #4070a0; } /* SpecialChar */
code span.ss { color: #bb6688; } /* SpecialString */
code span.st { color: #4070a0; } /* String */
code span.va { color: #19177c; } /* Variable */
code span.vs { color: #4070a0; } /* VerbatimString */
code span.wa { color: #60a0b0; font-weight: bold; font-style: italic; } /* Warning */
```

This CSS is great, but only actually needs to be generated once. I copied this CSS in a single [file](https://github.com/pavo-etc/pavo-etc.github.io/blob/94d59de43188660d625d12b5df33894841f99922/styles/code.css). After copying this text, the `--standalone` flag can be omitted.

### with theming?

The colours used in the highlighting can be customised! As with everything else in my life at the moment, I use [Dracula](https://draculatheme.com/), which thankfully [already has a theme for Pandoc](https://draculatheme.com/pandoc).

Once the theme is installed, Pandoc can highlight using the theme with the `--defaults` flag:

```bash
pandoc inputfile.md -o output.html --to=html5 --standalone --defaults path/to/theme/dracula.yaml
```

The HTML classes will be the same names regardless of the theme, but the inline CSS will be dependent on the theme. Again, this only needs to be run once, and the inline CSS can be copied and saved to be used later.

## Simple Templating

Pandoc makes it simple, as long as you only need simple template insertions! HTML templates can be created easily. A basic template could look like the following:

```HTML
<!DOCTYPE html>
<head>
    <link rel="stylesheet" href="/styles/code.css">
    <title>$title$</title>
</head>

<body>
    <header>
        <h1>$title$</h1>
        <p>$subtitle$</p>
        <p>$date$</p>
    </header>

    <article>
        $body$
    </article>
</body>
```

Note the inclusion of the stylesheet. `code.css` includes the CSS for code highlighting.

The `body` variable is automatically assigned to the content of the Markdown file, and the rest of the variables can be assigned manually using a YAML header in the Markdown file.

````Markdown
---
title: A Titular Title
subtitle: A subtitular subtitle
date: 2022-06-12
---

## Chapter 1: Where it all began

Lorem ipsum amirite.  Hey look a fenced code block:

```Python
if x == 5:
    print("x is equal to 5")
```
````

To use the template, you use the `--template` flag in the Pandoc invocation:

```bash
pandoc inputfile.md -o outputfile.html --to=html5 --template=path/to/template.html
```

## Dependencies

None! The outputted HTML has no external dependencies.

## Automated?

It's a pain typing out that command for each post - so don't.

```bash
#!/usr/bin/env bash

nonposts=("styles/", "templates/")

for d in */; do
	echo "$d"
	if ! [[ ${nonposts[*]} =~ $d ]]; then
		echo "is post"
		echo "generating index.html"
		name=$(echo "$d" | sed 's/.$//')
		echo "pandoc ${d}${name}.md -o ${d}index.html --to=html5 --template=templates/template.html"
		pandoc ${d}${name}.md -o ${d}index.html --to=html5 --template=templates/template.html
	fi
done
echo "done"
```

This script is designed to work on the following directory structure:

```bash
blog
├── basic-seleniumbasic
│   ├── adding-reference.png
│   ├── basic-seleniumbasic.md
│   ├── dotnet-frameworks.png
│   ├── index.html
│   └── seleniumbasic-installer.png
├── covid-updates
│   ├── covid-updates.md
│   ├── index.html
│   └── media_release.png
├── crafting-recipes
│   ├── crafting-recipes.md
│   └── index.html
├── file-descriptors
│   ├── file-descriptors.md
│   └── index.html
├── generate_posts.sh
├── hep-001
│   ├── hep-001.md
│   └── index.html
├── index.html
├── poor-mans-site
│   ├── index.html
│   └── poor-mans-site.md
├── templates
│   └── template.html
└── usernames
    ├── index.html
    └── usernames.md
```

It opens every directory (except those in `nonposts`), runs pandoc on a Markdown file with the same name as the directory, and outputs `index.html` based on `templates/template.html`.

The top level `index.html` is not modified by the script at all. This page presumably would link to the subdirectories and must be manually modified. Ugh.
