---
title: The H Chord
subtitle: How German monks broke my website
tagline: How German monks broke my website
date: 2023-05-08
---

I received a [strange bug report](https://github.com/pavo-etc/penultimate-guitar/issues/41) on [Penultimate Guitar](https://pg.zachmanson.com) where the Next.js rendering would fail completely on certain songs.

## The Error

The type error was being triggered by a chord component, where the key was undefined. The chords are pulled from Ultimate Guitar, so I inspected the JSON payload from the [original source](https://tabs.ultimate-guitar.com/tab/1684995).

![](ug.png)

Why the hell is there a `[ch]H[/ch]` chord in there? That's definitely the cause as I never accounted for non-existent keys. Looking at Ultimate Guitar, it renders as a B chord.

![](ug-rendered.png)

Huh?

<details markdown="1">
<summary>An aside on Ultimate Guitar HTML</summary>
The way Ultimate Guitar handles data is bizarre. It passes a static HTML page to the client, but this page doesn't contain any chords, lyrics or metadata. This information is all contained within a giant JSON payload in an escaped string within an attribute of a random `div`, and is rendered using client side JavaScript. This contains all the metadata, the content of the songs, the chord patterns and a ton of other information. Why isn't this just incrementally statically generated? Or SSR?
</details>

## One Google Search Later

Germany and the Netherlands ha(d/ve) their own musical key notation that include(d/s) a H chord. [This site](https://www.guitarsite.com/newsletters/010122/12.shtml) claims it ended in "1994/1995", though I've seen [other](https://github.com/pavo-etc/penultimate-guitar/issues/41#issuecomment-1538452351) [sources](https://www.reddit.com/r/musictheory/comments/8rn0ve) claim its still taught this way. This comes as an artifact of the bizarre history Western music notation, which is a problem I seem to keep running into recently in my attempts to learn more about music theory.

> I learned in music school that the chord is called "B" (like in the rest of the world), but the note is called "H" (eg. the C Major scale would be C, D, E, F, G, A, H, C).

<cite>TobTobXX, who reported the bug</cite>

## Western Music's Stupid Origins

Western music is based on ecclesiastic modes used in church in the early Middle ages, which only used the notes of the modern C scale (diatonic). This is why these notes are considered the natural notes. Sharp and flat notes only came into common use hundred of years later, and added to the existing system as a kind of kluge where they were slotted between the diatonics. They were considered less important than the natural notes until the Romantic Era. Sadly we still have to deal with this technical debt.

Modern B♭ and B were called "soft" and "hard" B at the time as they were represented with a rounded lowercase "b" and a squared off lowercase "b" respectively. The flat and natural symbols derived from these characters.

Another theory posits that flats were represented with b due to the German word _blatt_ meaning "planar" (at least [according to Wikipedia](<https://en.wikipedia.org/wiki/Flat_(music)>) without a citation).

Somewhere along the line, monks transcribing these characters confused the squared of "b" for "h", and this was later assumed to be intentional. "H" became a convention for writing modern B, while the "b" character remained convention for writing modern Bb. "B" and "b" eventually became amalgamated, both coming to represent modern B♭.

## Resolution

I don't love dealing with problems caused by the whims of millenia dead monks, but this was an interesting rabbit hole to fall into. The issue has since been patched, and I look forward to my mistakes ruining someone's day in 3023.

![](commit.png)
