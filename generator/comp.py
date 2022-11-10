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
    links = ["projects", "blog"]
    link_elements = []
    for link in links:
        is_active = ' activated-link' if activated_link == link else ''
        link_elements.append(f'        <a href="/{link}/" class="discrete-link{is_active}">{link.capitalize()}</a>')
    
    right_links_str = '\n'.join(link_elements)

    is_root_active = ' activated-link' if activated_link == '.' else ''
    return f"""
    <nav>
        <div class="flex">
        <div class="flex-left">
            <a href="/" class="discrete-link">Zach Manson</a>
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
          href="https://github.com/pavo-etc/pavo-etc.github.io/tree/master/generator"
          >ironprof</a
        >
      </p>
    </footer>"""