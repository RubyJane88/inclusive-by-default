# Recording the demo videos

Shot list for videos A, B and C (talk slides 11, 19 and 26), plus the opening clip (slide 3). Each video is 90 to 120 seconds. All terminal output below is real, captured on 17 October 2026.

## Before every session

- Run `make check`. All 12 targets must say `ok`.
- Screen at 1920 by 1080. Hide the dock, notifications, bookmarks bar and account details.
- Terminal: light background, dark text, font about 22pt, window about 100 columns by 30 rows. Every demo's output fits that.
- Clear prompt: `export PS1='$ '` then `clear`.
- Turn on captions in your editing tool. Caption every VoiceOver announcement exactly.

## Video A: Green tests, broken page (slide 11)

| Step | Do | Point at | Say (cue) |
|---|---|---|---|
| 1 | `make demo1-before` | `2 passed` | "These tests pass. The click works." |
| 2 | `make demo1-catch` | The first message: no textbox named "Email" | "Same flow, found the way a screen reader finds it. The field has no name." |
| 3 | Scroll to the axe block | Six rules, one line each | "And axe ran after every test without being asked." |
| 4 | `make demo1-after` | `4 passed` | "Same tests, fixed page." |
| 5 | VoiceOver on `broken` (below) | | Let VoiceOver speak. |

Real output of step 2, start and end:

```
Expected: a textbox named "Email"
Found:    2 textboxes, none named
          The text "Email" is on the page but does not name any textbox
Fix:      Connect the visible text with <label for="...">Email</label>
...
Expected: no WCAG A or AA failures that axe can detect
Found:    6 rules fail (rule, where, fix):
  button-name     #settings                  give the button text, or aria-label
  color-contrast  .brand +5                  darken the text to at least 4.5:1 (now 2.81:1)
  document-title  html                       add a <title> that names the page
  html-has-lang   html                       add lang="en" to <html>
  image-alt       img                        add alt text that describes the image
  label           #email +1                  connect text with <label for="...">
Fix:      the change on each line. Rule details: dequeuniversity.com/rules/axe/4.14
4 failed in 5.01s
```

## Video B: What axe can't see (slide 19)

Record the browser window and the terminal together, side by side.

| Step | Do | Point at | Say (cue) |
|---|---|---|---|
| 1 | Show `app/broken/index.html`, dialog section | `role="dialog"`, `aria-modal="true"` | "The markup is correct. axe finds nothing here." |
| 2 | `make demo2-broken` | Focus ring stays on "Delete account"; key overlay shows Enter | "The dialog opens. Focus stays behind it." |
| 3 | Terminal | Step 2 of 5 message | "The test names the step that broke." |
| 4 | `make serve`, open `http://localhost:8000/broken/` in a browser, open the dialog, press Tab repeatedly | Focus reaches the settings button and form fields behind the open dialog | "A keyboard user is now working a page they cannot see." |
| 5 | `make demo2-fixed` | Focus moves in, Tab cycles inside, Escape closes, focus returns to "Delete account" | "Five steps, all pass." |

Real output of step 3:

```
Expected: step 2 of 5: focus moves into the dialog
Found:    focus is on button "Delete account", outside the dialog
Fix:      use <dialog> and open it with showModal()
```

Notes:
- The headed runs open their own Chromium window and close it when the test ends. `demo2-fixed` takes about 7 seconds at recording speed.
- In Chromium, Tab past the last dialog button briefly moves focus to the browser's own controls, then back into the dialog. That is expected and allowed by the test. Mention it if it shows on screen.
- On `broken`, the first Tab after opening happens to land on the dialog's buttons because they come after the page in the HTML. Keep tabbing to show focus reaching the page behind.

## Video C: Names that mean nothing (slide 26)

| Step | Do | Point at | Say (cue) |
|---|---|---|---|
| 1 | `make demo3-axe` | `2 passed` | "axe is happy. Every control has a name." |
| 2 | `make demo3-names` | The list of names | "Here are the names." |
| 3 | VoiceOver on `hollow` (below) | | Let VoiceOver speak. |
| 4 | `make demo3-after` | `2 passed` | "Names that say what each thing does." |

Real output of step 2:

```
Expected: every button has a name that says what it is
Found:    3 buttons with weak names:
            "icon"       in header  generic word
            "Button"     in main    generic word
            "button"     in dialog  generic word
Fix:      name each button by its action, e.g. aria-label="Settings"
...
Expected: every image has a name that says what it is
Found:    1 image with a weak name:
            "image"      in main    generic word
Fix:      describe what each image shows, e.g. alt="Project dashboard"
2 failed in 1.66s
```

## VoiceOver segments (you record these)

Setup: `make serve`, then open the page in Safari. Turn VoiceOver on with Command+F5. Move with Tab for controls, or Control+Option+Right Arrow for everything.

The announcements below are expected, not verified. VoiceOver wording varies by macOS version. Caption what you actually hear.

| Page | Control | Expected announcement |
|---|---|---|
| `broken` | Settings icon | "button" |
| `broken` | Email field | "edit text" |
| `broken` | Hero image | the file name, or "image" |
| `broken` | Create account | not reachable by Tab; read as plain text |
| `hollow` | Settings icon | "icon, button" |
| `hollow` | Hero image | "image, image" |
| `hollow` | Submit | "Button, button" |
| `fixed` | Settings icon | "Settings, button" |
| `fixed` | Email field | "Email, edit text" |

## Opening clip (slide 3), 12 seconds

`make serve`, `broken` in Safari with VoiceOver on. Tab to the settings icon ("button"), Tab into the email field ("edit text"), then open the dialog with the "Delete account" button and show focus staying behind it. No narration for the first few seconds.

## After any change to app/ or framework/

Run `make check`, re-record the affected video, and re-copy the real output into slide 15 and this file.
