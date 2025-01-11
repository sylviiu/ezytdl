<h1 align="center">
  <img src="https://raw.githubusercontent.com/sylviiu/ezytdl/main/.github/heading.png" height="128px"/><br>
  <img src="https://github.com/sylviiu/ezytdl/actions/workflows/test-win.yml/badge.svg"/>
  <img src="https://github.com/sylviiu/ezytdl/actions/workflows/test-mac.yml/badge.svg"/>
  <img src="https://github.com/sylviiu/ezytdl/actions/workflows/test-linux.yml/badge.svg"/><br><br>
  <img src="https://raw.githubusercontent.com/sylviiu/ezytdl/main/.github/ezytdl-intro.gif">
</h1>

## MUCH more spaced out updates / "hiatus"

i've been working more as a video editor for the past year, and to be entirely honest, i have found very little spare time or motivation to continue providing valuable updates. i <em>do</em> still use ezytdl to this day, and i've noticed a lot of things that i can improve or fix, but it's become incredibly difficult to scrape together the motivation to do anything about it :(

don't get me wrong, i'm incredibly happy this project exists, and overall it remains one of the things i'm most proud of being able to put together, but everything i've been working on here's essentially come to a halt. i still have some untested local changes saved on my computer, but it's difficult to push a commit because i can't really guarantee that i can commit to the project as much as i once did. the codebase needs quite a bit of refactoring at this point, and that's just a task i can't really say i'm up for right now. sure, updates can still be done on the current codebase, but not to the extent that i usually want.

if you'd like to commit to the project, i'm open to pull requests - again, the codebase is pretty bad, so i can't blame you if you don't want to lol. i will however likely come back every once in a while to patch a specific bug that bothers me enough, or to update dependencies to make sure vulnerabilities don't get too bad :^)

-----

## What is this?

**ezytdl** is an application that leverages yt-dlp and FFmpeg to provide a simple, easy-to-use interface for downloading videos from YouTube, Twitch, SoundCloud, and various other sites. It is built using [Electron](https://www.electronjs.org/), and is available for Windows, MacOS, and Linux.

-----

## Okay, a yt-dlp frontend, that's been done *many* times. How is this different from other ones?

- **Speed:** I've created a custom [python script](https://github.com/sylviiu/ytdlp-pybridge/) that acts as a bridge between the yt-dlp executable and the Electron app, [which allows for a much faster startup time than other yt-dlp frontends.](https://github.com/sylviiu/ezytdl/issues/51#issuecomment-1686556643)
- **Compatibility:** ezytdl is built using [Electron](https://www.electronjs.org/), which provides a cross-platform framework for building desktop applications. This means that ezytdl is available for Windows, MacOS, and Linux, and will work on all of them.
- **Feature Rich:** ezytdl gives you the ability to utilize yt-dlp in any way you wish, and also leverages FFmpeg in more ways than one. Aside from being able to download the highest quality media a service provides and merge using FFmpeg, ezytdl also provides an easy interface to convert media you already have on your system!

...and more which [softpedia detailed in their review of this app!](https://www.softpedia.com/get/Internet/Download-Managers/ezytdl.shtml)<br><sub>*Thank you Robert Condorache!*</sub>

-----

## Installation

There are multiple ways you can get started with this! (at least on windows)

You can either run the portable version, or install it to your system!

- Head over to the [releases page](https://github.com/sylviiu/ezytdl/releases) and download either the setup or portable version of the latest release
- And just run. Done!

-----

## Building / running from source

- Make sure you have [Node.JS](https://nodejs.org/en) (and NPM) installed
- Clone the repository using the git client, or download the ZIP of either the latest release / from source code and extract.
- Install the package dependencies using `npm i` in the terminal.
- If you want to run the program from source code, you can just use `npm start`.
- If you want to *build* a portable program, running `npm run dist` will package up the program into an executable. The resulting package will be found in a newly-created `dist` directory

---

#### obligatory note

by using this program (ezytdl), you assume all responsibility for the use of it, including (but not limited to) any legal issues that may arise from it. the author of this program is not responsible for any damages caused by the use of this program.