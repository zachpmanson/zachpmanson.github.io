import os
import datetime

import pytz
import markdown
import frontmatter
import jinja2
from feedgen.feed import FeedGenerator

import comp

ignore_dirs = [
    "templates",
    "index.html",
    "generate_posts.sh",
    ".DS_Store",
    "feed.xml",
    "generator",
    "build.sh",
    "CNAME",
    "venv",
    "styles",
    ".git",
    "images",
    "icons",
    "blog",
    ".gitignore"
]

def generate_blog():
    def get_post_date(post_dir):
        with open(os.path.join("blog", post_dir, post_dir+".md"), "r") as post_file:
            post = frontmatter.load(post_file)
            meta = post.metadata
        return meta["date"]

    blog_meta = {
        "title": "Memory Leaks",
        "subtitle": "Artisanally crafted text dumps",
        "blog_link": "https://zachmanson.com/blog/",
        "rss_link": "https://zachmanson.com/blog/rss.xml",
        "author": {
            "name": "Zach Manson",
            "email": "zachpmanson@gmail.com"
        },
        "logo": "https://zachmanson.com/icons/android-chrome-256x256.png"
    }

    tz = pytz.timezone("Australia/Perth")

    posts_dirs = [d for d in os.listdir("blog") if d not in ignore_dirs if d[0] != "."]

    posts_dirs.sort(key=get_post_date)
    #posts_dirs.reverse()

    post_template = jinja2.Template(open("generator/post.jinja", "r").read())
    postlist_template = jinja2.Template(
        open("generator/postlist.jinja", "r").read())

    fg = FeedGenerator()
    fg.id(blog_meta["blog_link"])
    fg.title(blog_meta["title"])
    fg.author(blog_meta["author"])
    fg.link(href=blog_meta["blog_link"], rel='alternate')
    fg.logo(blog_meta["logo"])
    fg.subtitle(blog_meta["subtitle"])
    fg.link(href=blog_meta["rss_link"], rel='self')
    fg.language('en')

    posts_data = []


    for post_dir in posts_dirs:
        link = "https://zachmanson.com/blog/"+post_dir

        with open(os.path.join("blog", post_dir, post_dir+".md"), "r") as post_file:
            post = frontmatter.load(post_file)
            meta = post.metadata
            meta["datetime"] = datetime.datetime.fromisoformat(
                meta["date"].isoformat())
            meta["datetime"] = tz.localize(meta["datetime"])
            body = markdown.markdown(
                post.content,
                extensions=['fenced_code', "codehilite", 'md_in_html', 'toc']
            )

            # RSS description uses absolute links and no code highlighting
            rss_body = markdown.markdown(
                post.content,
                extensions=['pymdownx.pathconverter', 'fenced_code', 'md_in_html'],
                extension_configs={
                    'pymdownx.pathconverter': [
                        ('base_path', f"blog/{post_dir}"),
                        ('absolute', True)
                    ]
                }
            )
        meta["post_dir"] = post_dir

        with open(os.path.join("blog", post_dir, "index.html"), "w") as f:
            f.write(post_template.render({
                **meta,
                "body":body,
                "comp":comp
            }))
            print(f"Generated ./blog/{post_dir}")

        # Generate data for RSS feed
        fe = fg.add_entry()
        fe.id(link)
        fe.title(meta["title"])
        fe.description(meta["tagline"])
        fe.content(rss_body, type='CDATA')
        fe.link(href=link)
        fe.guid(link)
        fe.published(meta["datetime"])

        posts_data.append(meta)

    with open("blog/index.html", "w") as f:
        f.write(postlist_template.render({
            "posts_data": reversed(posts_data), 
            "date":datetime.datetime.now(),
            "comp":comp
        }))
        print("Generated ./blog/index")

    with open("blog/feed.xml", "wb") as f:
        f.write((fg.rss_str(pretty=True)))

def recursive_build():
    # Recursively walk tree and generate index.html based on index.template.html 
    for (root,dirs,files) in os.walk('.', topdown=True):
        if (root != ".") and root.split("/")[1] in ignore_dirs:
            continue

        title = root.split("/")[-1]
        for file in files:
            if not file.endswith(".jinja"):
                continue
            page_name = file[:-6]
            page_template = jinja2.Template(open(os.path.join(root, file), "r").read())
            with open(os.path.join(root, f"{page_name}.html"), "w") as f:
                f.write(page_template.render({
                    "comp":comp
                }))
                print(f"Generated {root}/{page_name}.html")

if __name__=="__main__":
    generate_blog()
    recursive_build()



