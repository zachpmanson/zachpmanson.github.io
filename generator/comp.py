# Functions to generate components for ironprof jinja templates

def meta():
    return """
    <link rel="stylesheet" href="/styles/colors.css" />
    <link rel="stylesheet" href="/styles/global.css" />

    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href="/icons/apple-touch-icon.png"
    />
    <link
      rel="icon"
      type="image/png"
      sizes="32x32"
      href="/icons/favicon-32x32.png"
    />
    <link
      rel="icon"
      type="image/png"
      sizes="16x16"
      href="/icons/favicon-16x16.png"
    />
    <link rel="manifest" href="/icons/site.webmanifest" />
    <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#bd93f9" />
    <link rel="shortcut icon" href="/icons/favicon.ico" />
    <meta name="msapplication-TileColor" content="#603cba" />
    <meta name="msapplication-config" content="/icons/browserconfig.xml" />
    <meta name="theme-color" content="#282A36" />

    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="UTF-8" />
"""

def nav(activated_link):
    links = {
      "projects":"Projects",
      "blog":"Posts"
    }
    link_elements = []
    for (link, name) in links.items():
        is_active = ' activated-link' if activated_link == link else ''
        link_elements.append(f'        <a href="/{link}/" class="discrete-link{is_active}">{name}</a>')
    
    right_links_str = '\n'.join(link_elements)

    is_root_active = ' activated-link' if activated_link == '/' else ''
    return f"""
    <nav>
      <div class="flex">
      <div class="flex-left">
        <a href="/" class="discrete-link{is_root_active}">Zach Manson</a>
      </div>
      <div class="flex-right">
        {right_links_str}
      </div>
      </div>
    </nav>"""

def blog_footer():
    return """
    <footer>
      <p>
        <a href="/blog/feed.xml">Feed</a> -
        <a
          href="https://notes.zachmanson.com/ironprof/"
          >ironprof</a
        >
      </p>
    </footer>"""

def project_post(name="", year="", url="", desc="", lang="", img="", repo="", writeup=""):
    if img != "":
      img_el = f"""
          <div class="post-image">
            <img class="thumbnail" src="{img}" />
          </div>"""
    else:
      img_el = ''

    name_with_link = f'<a href="{url}">{name}</a>' if url != "" else name

    repo_link = f'<br><a href="{repo}">Source code</a>' if repo != "" else ""
    writeup_link = f' - <a href="{writeup}">Writeup</a>' if writeup != "" else ""
    
    links = []

    if repo != "":
      links.append(f'<a href="{repo}">Source code</a>')

    if writeup != "":
      links.append(f'<a href="{writeup}">Writeup</a>')

    link_html = f"<br>{' - '.join(links)}" if len(links) > 0 else ""


    return f"""
      <div class="project">
        <div>
          <h3>{name_with_link} <!-- <span class="date">({year})</span> --></h3>
        </div>

        <div class="inline-flex">
          <div class="project-description">
            <p>
              {desc}
              <span class="italic"><br>{lang}</span>
              {link_html}
            </p>
         
          </div>
          {img_el}
        </div>
      </div>"""