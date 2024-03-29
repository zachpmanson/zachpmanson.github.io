---
title: This feed has moved and GitHub Pages won't let me redirect you automatically
subtitle: Sorry for the inconvenience
tagline: Sorry for the inconvenience
date: 2023-01-26
---

I haven't written on here in a while, but I have been writing on my [public notes](https://notes.zachmanson.com). At this point I've got over 300 pages on there, far more than I ever wrote on here but in a format that looks a lot more like a wiki. This is mostly a factor of convenience, the format of the notes means I can iteratively add whatever I am thinking about, without the expectation of the writing being complete and canonical. The writing is organised into a heirarchy of folders, with tags and backlinks. I find this format much better for wiki-style writing but doesn't lend itself well to chronological feeds like this one.

Occasionally I would write a note on there that would fit well into the blog format, or was long and more story based. Some of my posts on this blog worked much better as wiki pages than as blog posts. I have wanted to unify these two sites for a long time now. Last week I finally got around to it!

The [Ochrs](https://notes.zachmanson.com/ochrs) site generator that I wrote to build the wiki can now generate chronological feeds of posts and RSS feeds. Feeds are generated based on tags, where each tag has its own RSS feed. A note can be added to a chronological feed by adding a publish date (`date` field in the frontmatter), which will then be used as the publish date in all feeds that the note is a part of. This approach is great since it allows each note to exist anywhere in the wiki hierarchy while also being a part of many feeds. The RSS feed will be at `notes.zachmanson.com/<tagname>.xml`, and the list of notes in a chronological feed can be shown on a page using the `ochrs:chrono:<tagname>` build function (see [Ochrs Syntax](https://notes.zachmanson.com/ochrs-syntax) for more on how this works), which will results in all the posts being displayed in blog-style HTML.

To succeed `zachmanson.com/blog/` I have created the posts tag. The feeds can be seen at [notes.zachmanson.com/posts](notes.zachmanson.com/posts) and using [RSS](https://notes.zachmanson.com/posts.xml). I have moved the existing posts here over to the this new feed.

If you are reading this using RSS then I would like to apologize that you will have to subscribe to a new feed. I would have like to automatically redirect your feed reader, but **GitHub Pages doesn't let you create 301 redirects**. The `redirect-from` plugin is capable of meta tag redirects, but those are soft and not followed by feed readers. This is very frustrating.

I've marked a bunch of longer notes I've made as posts, so the new feed already has 7 new posts. Hopefully more will come soon!
