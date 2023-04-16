---
title: LinkedIn's Ghost Text
subtitle: Why does LinkedIn copy text twice
tagline: Why does LinkedIn copy text twice
date: 2023-04-16
---

Why does LinkedIn do this?

<video autoplay loop muted>
   <source src="./duplication.webm" type="video/webm">
</video>

If you look into the source of a LinkedIn profile page (at your own personal risk) you'll find a text element like this

![](./element.png)

will have HTML like this

```html
<div class="display-flex flex-row justify-space-between">
    <div class="
          display-flex flex-column full-width">

        <div class="display-flex flex-wrap align-items-center full-height">
            <span class="mr1 t-bold">
                <span aria-hidden="true"><!---->Product manager, Creative coder<!----></span>
                <span class="visually-hidden"><!---->Product manager, Creative coder<!----></span>
            </span>
            <!----><!----><!---->
        </div>
        <span class="t-14 t-normal">
            <span aria-hidden="true"><!---->Freelancer/Consultant<!----></span>
            <span class="visually-hidden"><!---->Freelancer/Consultant<!----></span>
        </span>
        <span class="t-14 t-normal t-black--light">
            <span aria-hidden="true"><!---->2009 - 2018 · 9 yrs<!----></span>
            <span class="visually-hidden"><!---->2009 - 2018 · 9 yrs<!----></span>
        </span>
        <span class="t-14 t-normal t-black--light">
            <span aria-hidden="true"><!---->Europe<!----></span>
            <span class="visually-hidden"><!---->Europe<!----></span>
        </span>

    </div>

    <!---->
    <div class="pvs-entity__action-container">
        <!---->
    </div>
</div>
```

Gross.  Why the hidden duplicated text?  Why the empty comments?  Why seperate aria versions of text?  Is this related to using Ember?  LinkedIn has so many little unpleasantries like this.