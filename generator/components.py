# Functions to generate components for ironprof jinja templates


def meta():
    return """
    <link rel="stylesheet" href="/styles/colors.css" />
    <link rel="stylesheet" href="/styles/global-tw.css" />


    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />


    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="UTF-8" />
"""


def nav(activated_link):
    links = {
        "projects": "Projects",
        # "blog":"Posts"
    }
    link_elements = []
    for link, name in links.items():
        is_active = " activated-link" if activated_link == link else ""
        link_elements.append(
            f'        <a href="/{link}/" class="{is_active}">{name}</a>'
        )

    right_links_str = "\n".join(link_elements)

    is_root_active = " activated-link" if activated_link == "/" else ""
    return f"""
    <nav>
      <div class="flex gap-1 justify-end">
        <div class="flex">
          <a href="/" class="{is_root_active}">Zach Manson</a>
        </div>
        <div class="flex gap-1">
          {right_links_str}
        </div>
      </div>
    </nav>"""


def blog_footer(title=""):
    reply_link = (
        ""
        if title == ""
        else f'- <a href="mailto:zachpmanson@gmail.com?subject=Reply: {title}">reply</a>'
    )

    return f"""
    <footer>
      <p>
        <a href="/blog/feed.xml">rss</a>
        - <a href="https://notes.zachmanson.com/ironprof/">ironprof</a>
        {reply_link}
      </p>
    </footer>"""


def project_post(
    name="", year="", url="", desc="", lang="", img="", repo="", writeup=""
):
    if img != "":
        img_el = f"""<img src="{img}" />"""
    else:
        img_el = ""

    name_with_link = f'<a href="{url}">{name}</a>' if url != "" else name

    repo_link = f'<br><a href="{repo}">Source code</a>' if repo != "" else ""
    writeup_link = f' - <a href="{writeup}">Writeup</a>' if writeup != "" else ""

    links = []

    if writeup != "":
        links.append(f'<a href="{writeup}">Read more</a>')
    if repo != "":
        links.append(f'<a href="{repo}">Source code</a>')

    link_html = f"<br>{' - '.join(links)}" if len(links) > 0 else ""

    # {f'<i><br>{lang}</i>' if lang else ''}

    # {link_html}
    return f"""
      <div class="project">
        {img_el}
        <p>
          <span class="project-title">{name_with_link}</span> {desc}
        </p>
      </div>"""
