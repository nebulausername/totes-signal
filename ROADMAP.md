# Roadmap: UX, UI and mobile

TOTES SIGNAL is playable and live, but still in development. This is the plan for making it feel like a game
that was *designed* for phones, not only adapted to them. The order is a plan, not a promise, and there are
no dates.

Findings come from measuring the live build: real screenshots at phone and desktop sizes, the Playwright
harness in `tools/verify`, and reading the code. Where a number appears, it was measured.

## Done so far

<details>
<summary><b>Mobile foundation</b> (July 2026)</summary>

- Touch controls, start gate, rotate hint; German and English; installable app with offline play
- Mobile performance: resolution cap and dynamic render resolution
- Aim assist for thumbs, hybrid aim-lock, auto-sprint tuning
- "Dead Signal" menu redesign, death screen with retry and stats, brightness presets
- Self-healing updates (build tag + `version.json`)
- Menu buttons react to the first tap; bottom buttons moved out of the gesture zone

</details>

<details>
<summary><b>Making it solid</b> (August 2026)</summary>

- Updates reliably reach players; verification harness
- HUD readable on phones; ammo, perks and round counter no longer hidden under buttons
- Accounts, leaderboard with anti-cheat, 42 achievements back on, account view
- Settings screen with left-handed mode, hit haptics, finger-friendly pause menu
- Join by short code; real loading progress; "continue last run"
- Strict content security policy; a content check of all textures and images
- Damage-direction indicator; the desktop treated as a first-class platform

</details>

<details>
<summary><b>Co-op</b> (late August 2026)</summary>

- A browser can host a game (own broker and STUN); invite link; lobby where the host sets up the round
- Player list and kick; joining allowed up to round 3; outage detection
- Readable co-op scoreboard and HUD; revive marker at the screen edge
- AI teammates, quick calls and a readable chat
- Separate leaderboards for solo and co-op runs

</details>

## Next

### 1. Controls 3.0 (phones)

Today's touch layout grew button by button. On the right edge sit ten controls in four different sizes,
labelled with German words in a monospace font, and their width depends on the word length.

- One button size, icons instead of words (this also ends the translation-length problem)
- **Jump reachable while holding fire.** Today both sit in the same column, 36 vmin apart
- An analog joystick instead of today's 8-way digital one
- Graded aim assist, a separate sensitivity for aiming down sights, optional gyro aiming
- Fix: in left-handed mode the fire button flips for 220 ms on every kill
- Button opacity should also apply to pressed buttons and the joystick
- Scoreboard and revive usable by finger in co-op
- A test matrix for the controls: WebKit, small phones (667×375), left-handed, reduced motion

Three concepts are sketched. The recommendation is a grid layout with swipe-up to jump and drag-to-aim
on the fire button. The choice is still open.

### 2. HUD and readability

The in-game HUD is inherited from NZ:P, not designed for this game.

- The chapter card should appear once, not on every round change
- A teammate strip for co-op
- The pause menu collides with its footer at the smallest HUD size
- A probe that checks what the engine actually draws against the touch buttons

### 3. Menus and discoverability

- One engine menu entry starts the wrong mode (GRIEF starts Gun Game)
- 11 locked maps have never been play-tested
- English leftovers: "COOPERATIVE" and a German default player name
- 12 achievements can never be earned yet, and 9 more need progress across runs
- A real language picker instead of an on/off switch
- Portrait layouts for start, join, lobby, death and settings screens

### 4. Accessibility

- Zoom is disabled page-wide (`user-scalable=no`); limit that to the game canvas
- Overlays need focus handling (`inert`, focus trap) and should close with Escape
- Touch targets below 44 px: tabs (29 px), switches (21 px), rows (37 px)
- Two contrast issues; wider reduced-motion coverage

### 5. Performance

- The first visit downloads about 96 MB, 43 MB of it music; a smaller derived pack
- Measure the frame rate on a phone that hosts three guests
- The translation lookup in the engine scans linearly, about 73 times per frame; use a hash table

### 6. Co-op

- Test connections across two real networks (home router, mobile data) before building a relay
- Free-text chat input
- Scores in player-hosted games can be faked by the host: cross-check and label server vs. friends rounds
- A real team leaderboard
- A separate test database for the harness

### 7. Languages

- One file per language, generated for both the web shell and the engine
- A font atlas for accented characters, plural forms, a fallback for missing keys
- Slovak, Polish and Turkish as the first new languages
- Loading tips, bios and map texts are still hard-coded German

### 8. Credits and legal

- Put the full NZ:P Team credits back on the in-game credits screen
- A footer on the start page: NZ:P credit, GPL notice, link to this repository, imprint and privacy policy
- Replace the hard-coded age and privacy confirmation with a real prompt
