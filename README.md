# DONKEY.BAS

Play it in the browser: **[donkeybas.com](https://donkeybas.com)**

## What is DONKEY.BAS?

Donkey, often known by its file name DONKEY.BAS, is a computer game written in 1981 and included with early versions of the PC DOS operating system distributed with the original IBM PC. It is a driving game in which the player must avoid hitting donkeys. The game was written by Microsoft co-founder Bill Gates and Neil Konzen.

## History

When IBM was developing the PC in the late 1970s and early 1980s it contracted Microsoft to develop an operating system and a version of the BASIC programming language to release with the new computer. The operating system was released as PC DOS when included with IBM PCs and MS-DOS when sold separately by Microsoft. Both included versions of Microsoft BASIC.

DONKEY.BAS was written by Bill Gates and Neil Konzen to demonstrate the IBM PC and the BASIC programming language's capability to produce interactive programs with color graphics and sound. The game continues to generate interest in part because of the involvement of Gates at a time when Microsoft was relatively small and only six years old.

The first version of DONKEY.BAS was released in 1981, followed by version 1.10 in 1982. The operating systems with which the game was first distributed still work on modern computers with compatible BIOS and 5.25-inch floppy drives; however, IBM BASICA which ran the program under PC DOS 1.x requires ROM-based IBM Cassette BASIC, which modern computers do not have.

## Web port

This repository hosts a faithful browser remake (HTML Canvas + JavaScript) of version 1.10:

- CGA SCREEN 1 resolution (320×200) with integer upscaling
- Original lane-switch gameplay, scoring, and BOOM scatter
- Sprites rebuilt from the original `DRAW` / `GET` data in [`DONKEY.BAS`](DONKEY.BAS)
- Optional CRT scanlines; Space / tap to switch lanes
- Optional **Cheat** mode (auto-dodge) — and there might be an Easter egg or two in there

### Local play

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/
```

(ES modules require HTTP, not `file://`.)

## Deploy to GitHub Pages (donkeybas.com)

The site is static files at the repo root. [`CNAME`](CNAME) points at `donkeybas.com`.

1. **GitHub → Settings → Pages**
   - Source: Deploy from branch
   - Branch: `main` / `/ (root)`
   - Custom domain: `donkeybas.com`
   - Enable **Enforce HTTPS** after DNS works

2. **DNS at your registrar** (apex + www):

   | Type  | Name | Value |
   | ----- | ---- | ----- |
   | A     | `@`  | `185.199.108.153` |
   | A     | `@`  | `185.199.109.153` |
   | A     | `@`  | `185.199.110.153` |
   | A     | `@`  | `185.199.111.153` |
   | CNAME | `www`| `jkrauska.github.io` |

3. Wait for DNS / TLS (often under an hour; sometimes longer). Confirm with:

   ```bash
   dig +short donkeybas.com A
   curl -sI https://donkeybas.com | head -5
   ```

If GitHub Pages SSL for the apex domain is awkward, the same files deploy unchanged to Cloudflare Pages with the domain attached there.

## Gameplay

DONKEY.BAS is an extremely simple driving game in which the player controls a car but cannot steer, accelerate or brake, only changing lanes to avoid a series of donkeys on the road. There is no goal other than to avoid donkeys.

The game uses the CGA display mode, the only colour graphics mode available on the original IBM PC. The mode allows four colours but in DONKEY.BAS there are usually only three on screen.

The center of the screen shows a vertical scrolling road with two lanes; the areas either side of the road are used for scores and instructions. The player's car is driving up the road and every few seconds a donkey will appear at random on one side of the road at the top of the screen. As the donkey moves down the screen the player can press the space bar to switch between lanes to avoid the donkey. If the car hits the donkey, both car and donkey explode, and parts of the graphics are scattered to the four corners of the screen to the sound of a short monophonic tune played through the PC speaker, with the word "BOOM!" displayed on the left side of the screen. If the player avoids the donkey, it will scroll off the bottom of the screen, with the words "Donkey loses!" displayed on the right side of the screen, and after a few seconds another will appear. There is never more than one donkey on the screen at any one time.

The game keeps score between the player and the donkeys. If the car hits a donkey, the donkey gets a point and the player is returned to the start of the road. As the car avoids donkeys it moves slowly up the screen, giving the player less time to react when donkeys appear. If the car avoids enough donkeys the player receives a point and the car is moved back to the bottom of the road. The game displays the number of points earned by the player and donkey but does not end or change when a particular score is reached.

Apart from pressing the space bar, the only control available to the player is to press the Esc key and quit the game.

## Listings

[Listing #1](DONKEY.BAS) — DONKEY.BAS original BASIC source code
