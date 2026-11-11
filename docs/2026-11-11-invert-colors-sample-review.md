# `invertColors` against monitor `result` samples, 2026-11-11

ENG-1260. A customer (Pylon #2708) gets HTML pages in a mix of light and dark
themes. The new `invertColors` option shows a page in the other theme.

## Method

- Source: `monitor.result`, read through the Redash API (data source 4). The
  HTML is in the `cloro-monitor-archive` bucket as gzip files.
- Sample: 15 rows with `status = 'SUCCESS'` for each `model` that has HTML,
  from the 24 hours before 2026-11-11 07:13 UTC. The rows are in a random
  order (`md5(id)`). 135 pages from 9 models and 17 countries.
- Each page was parsed with the dashboard defaults (`html-view.tsx`), one
  time without and one time with `invertColors: true`. The output was rendered
  in headless Chromium at 1280x900, with scripts off and styles, images and
  fonts loaded, as the dashboard iframe shows it. CSS animations were stopped
  before each screenshot.
- Theme: the mean luminance of the screenshot. Below 0.5 is dark. All 135
  pages are below 0.19 or above 0.85, so the split is clear.

| `model` | Parser provider |
|---|---|
| AIMODE | AIMODE |
| BING_AIMODE | BING_AIMODE |
| CHATGPT | CHATGPT |
| GEMINI | GEMINI |
| GOOGLE, GOOGLE_MOBILE, GOOGLE_NEWS, GOOGLE_KEYWORD, GOOGLE_KEYWORD_IOS | AIOVERVIEW |

Not tested: PERPLEXITY, COPILOT and GROK have no rows in the window.

## Theme of the pages before the change

The theme is in the HTML for almost all pages. All 135 pages were rendered
in the dashboard iframe, with styles loaded, one time with a light and one
time with a dark `prefers-color-scheme`. The luminance changed by more than
0.05 on 2 of 135 pages: one AIMODE page (0.95 to 1.0) and one CHATGPT page
(0.06 to 1.0). On these pages, the theme that the dashboard shows also
depends on the color scheme of the viewer.

| `model` | Dark pages |
|---|---|
| CHATGPT | 15 of 15 |
| AIMODE | 5 of 15 |
| GOOGLE_MOBILE | 2 of 15 |
| GOOGLE, GOOGLE_KEYWORD, GOOGLE_NEWS | 1 of 15 each |
| GEMINI, BING_AIMODE, GOOGLE_KEYWORD_IOS | 0 of 15 |
| **All** | **25 of 135** |

The markup does not identify the theme reliably. Dark Google pages have
`<meta name="color-scheme" content="dark light">` and `data-dt="1"` on
`<body>`, but one light GOOGLE_MOBILE page has both. Dark ChatGPT pages have
`<html class="dark">`. For this reason the option does not detect the theme.

ChatGPT pages now come in both themes. Of the 12 newest CHATGPT results on
2026-11-11 (09:10 to 09:50 UTC), 9 have `<html class="dark">` and 3 have
`<html class="light">`. With `invertColors: true`, all 12 changed theme in
the dashboard iframe, with a light and with a dark color scheme.

## Result with `invertColors: true`

| `model` | Pages | Theme changed | Same text | Same page height | Images that keep their colors (pixel check) |
|---|---|---|---|---|---|
| AIMODE | 15 | 15 | 15 | 15 | 29 of 32 |
| BING_AIMODE | 15 | 15 | 15 | 15 | no loaded images in the first screen |
| CHATGPT | 15 | 15 | 15 | 15 | 30 of 30 |
| GEMINI | 15 | 15 | 15 | 15 | 0 of 15 (see below) |
| GOOGLE | 15 | 15 | 15 | 15 | 29 of 34 |
| GOOGLE_KEYWORD | 15 | 15 | 15 | 15 | 10 of 21 |
| GOOGLE_KEYWORD_IOS | 15 | 15 | 15 | 15 | 12 of 28 |
| GOOGLE_MOBILE | 15 | 15 | 15 | 14 | 2 of 15 |
| GOOGLE_NEWS | 15 | 15 | 15 | 15 | 26 of 28 |
| **All** | **135** | **135** | **135** | **134** | **138 of 203** |

- **Theme changed** on 135 of 135 pages: 25 dark pages became light and 110
  light pages became dark.
- **Text** (`innerText` length) is the same on 135 of 135 pages.
- **Page height** is the same on 134 of 135 pages. The other page is 16 px
  shorter. Two more runs of that page gave the same height with and without
  the option, so the difference comes from the load time of the page.
- **Images, filter check.** On all 135 pages, 1,894 visible `img`, `video`,
  `canvas`, `iframe`, `embed` and `object` elements have an even number of
  invert filters (the one on `<html>` and their own), so their colors do not
  change. No page sets a `filter` of its own on these elements or on their
  ancestors. In the first screen, no page shows a photo as a CSS `background-image`.
- **Images, pixel check.** The check compares the pixels in the first screen
  that are different from the background next to the image. 65 of 203 images
  have less than 90% of these pixels unchanged. The screenshots show these
  causes. The image itself keeps its colors in all of them:
  - The image has transparent areas. These show the page background, which
    is inverted. All 15 GEMINI failures are the Gemini logo, which is a
    transparent PNG.
  - Google puts a layer on top of the image: a dark gradient on video
    thumbnails, and a light ring on the round site icons (favicons). The layer
    is inverted, so a video thumbnail looks lighter and a site icon a little
    paler.
  - A fixed bar at the bottom of the GOOGLE_MOBILE pages covers part of the
    image.

## Result in the dashboard iframe

The dashboard shows the page in a sandboxed `srcdoc` iframe with a white
background. All 135 pages were rendered again in such an iframe:

- The theme changed on 135 of 135 pages.
- The luminance of each inverted page is within 0.05 of the result above.

A first version of the style had no background on `<html>`. A page with no
background of its own then showed the white background of the iframe, which
the filter does not change, under white (inverted) text. No sample page has
this problem, but a fragment that the parser wraps or passes through does.
The version below fixes it.

## How it works

The parser adds a `<style>` element at the start of `<head>`:

```css
html {
  background-color: #fff;
  filter: invert(1) hue-rotate(180deg) !important;
}
img, video, canvas, iframe, embed, object, [style*="url("] {
  filter: invert(1) hue-rotate(180deg) !important;
}
```

`[style*="url("]` is for photos that a page shows as an inline CSS
background. Gemini shows a YouTube video as
`<div class="base-video-thumbnail" style="background-image: url(...)">`.
Before this rule, the thumbnail was inverted. After it, 84% of the thumbnail
pixels are unchanged on two Gemini pages from a local scrape. The play button,
the duration badge and the dark gradient on the thumbnail are separate
elements, so they are inverted. None of the 135 samples has an element with an
inline `url(...)` background of 40x40 px or more, or a photo background that a
class sets, so the rule does not change them.

`hue-rotate(180deg)` brings the hues back near the original values, so blue
links stay blue. The second rule applies the filter again to media, so they
keep their colors. A filter on the root element does not change the position
of `position: fixed` elements.

The white background has no `!important` and comes before the styles of the
page, so a page that sets its own background keeps it.

## ChatGPT mobile web page in a dark browser (fixed)

A local scrape of ChatGPT returned the mobile web page (`/unauth-mweb/`). No
production result in this review has this markup. The page is built with
Lightning CSS. It emulates `light-dark()` with the `--lightningcss-light` and
`--lightningcss-dark` variables, and a `prefers-color-scheme: dark` media
query switches them. In a browser with a dark color scheme, the background
became black (`#000`), but the answer text kept `rgb(13, 13, 13)`, with and
without `invertColors`. `color-scheme: light` on the page does not change a
media query, so it did not help.

The parser now sets `--lightningcss-light: initial` and
`--lightningcss-dark:` (empty) on all elements, for all providers and
without an option. The page then stays in the light theme that the scraper
saw. Results:

- The mobile web page: the same render with a light and a dark color
  scheme (background `rgb(252, 252, 252)`, text `rgb(13, 13, 13)`). With
  `invertColors`, white text on black.
- The 135 samples: no change with a light color scheme, with and without
  `invertColors`. With a dark color scheme, the renders that changed were
  load-time noise: two more runs of those pages gave the same result as
  with a light color scheme.

## Earlier colour inversion (removed in v0.3.0)

Commit `53a34f7` removed an earlier `invertColors` option "due to complexity".
It used three methods:

- ChatGPT, Gemini, Copilot, AI Mode and AI Overview: a light theme for each
  provider, with fixed colors for many class names. The code had open defects
  (ChatGPT citation pills and composer). A change in the class names of a
  provider breaks it. This change does not use this method.
- Perplexity: `html { filter: invert(1) hue-rotate(180deg); background-color:
  white !important }`. This is the method of this change. The old version did
  not apply the filter again to images, so photos were inverted. Its
  `!important` white background also replaced the background of the page. This
  change keeps the white background as a fallback only.
- Grok: remove the `dark` class and change `color-scheme: dark` to `light`, so
  the site shows its own light theme. This gives the real theme of the site,
  but only for sites that have a theme switch in the markup, and only in one
  direction. Dark ChatGPT pages have `<html class="dark">`, so this method can
  work for ChatGPT. It is not used, because the filter gives a good result on
  15 of 15 ChatGPT pages.

The parser applies the option in `parseAiResponse`, `parser.parse` and
`parser.parseWithProvider`, after the provider. It does not apply when a
provider class is called directly.

## Limits

- The option inverts. It does not make all pages light or all pages dark. To
  get one theme, the caller must know the theme of each page.
- Layers that Google and Gemini put on top of images (gradients, rings, play
  buttons, duration badges) are inverted.
- A photo that a class (not an inline style) sets as a CSS background is
  inverted. No sample has one.
- Emoji and colored SVG icons are inverted, then the hue is rotated back. Their
  brightness changes.
- The option keeps the contrast of the page. A page that has low contrast
  before the change has low contrast after it.
- One 24-hour window, 15 pages for each model, one viewport (1280x900).
- The scripts for this review are not in the repository.
