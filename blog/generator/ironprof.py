import os
import datetime

import pytz
import markdown
import frontmatter
import jinja2
from feedgen.feed import FeedGenerator


def get_post_date(post_dir):
    with open(os.path.join(post_dir, post_dir+".md"), "r") as post_file:
        post = frontmatter.load(post_file)
        meta = post.metadata
    return meta["date"]


ignore_dirs = [
    "templates",
    "index.html",
    "generate_posts.sh",
    ".DS_Store",
    "feed.xml",
    "generator",
    "build.sh",
    "venv"
]

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

posts_dirs = [d for d in os.listdir(".") if d not in ignore_dirs]

posts_dirs.sort(key=get_post_date)
#posts_dirs.reverse()

post_template = jinja2.Template(open("generator/post.html", "r").read())
postlist_template = jinja2.Template(
    open("generator/postlist.html", "r").read())

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

    with open(os.path.join(post_dir, post_dir+".md"), "r") as post_file:
        post = frontmatter.load(post_file)
        meta = post.metadata
        meta["datetime"] = datetime.datetime.fromisoformat(
            meta["date"].isoformat())
        meta["datetime"] = tz.localize(meta["datetime"])
        body = markdown.markdown(
            post.content,
            extensions=['fenced_code', "codehilite", 'md_in_html']
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

    data = {**meta, "body": body}

    with open(os.path.join(post_dir, "index.html"), "w") as f:
        f.write(post_template.render(data))
        print(f"Generated {post_dir}")

    fe = fg.add_entry()
    fe.id(link)
    fe.title(meta["title"])
    fe.description(meta["tagline"])
    fe.content(rss_body, type='CDATA')
    fe.link(href=link)
    fe.guid(link)
    fe.published(meta["datetime"])

    posts_data.append(meta)

with open("index.html", "w") as f:
    f.write(postlist_template.render({"posts_data": reversed(posts_data), "date":datetime.datetime.now()}))
    print("Generated blog index")

with open("feed.xml", "wb") as f:
    f.write((fg.rss_str(pretty=True)))
