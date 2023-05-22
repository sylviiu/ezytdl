<h1 align="center">
  <img src="https://raw.githubusercontent.com/sylviiu/ezytdl/main/res/img/heading.png" height="128px"/><br>
  <img src="https://github.com/sylviiu/ezytdl/actions/workflows/test-win.yml/badge.svg"/>
  <img src="https://github.com/sylviiu/ezytdl/actions/workflows/test-mac.yml/badge.svg"/>
  <img src="https://github.com/sylviiu/ezytdl/actions/workflows/test-linux.yml/badge.svg"/>
</h1>

Open source electron-based application acting as a wrapper of the YT-DLP client.

![Sequence 02_2-min](https://user-images.githubusercontent.com/95180094/236718122-e2252737-0b88-43e0-afba-3458e3bf6b9d.gif)

-----

## Installation

There are multiple ways you can get started with this! (at least on windows)

You can either run the portable version, or install it to your system!

- Head over to the [releases page](https://github.com/sylviiu/ezytdl/releases) and download either the setup or portable version of the latest release
- And just run. Done!

-----

## Building / running from source

This one is also fairly simple :D

### Easiest Method:

This option will let you build the app on GitHub itself, utilizing GitHub Actions.

- Fork the repository -- I'd recommend to keep it public, as [private repositories have a limited amount of builds, minutes and file storage.](https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration) You can name it whatever you want.
- Once the repository has been forked, head over to the actions tab at the top of the page.
- Once you're on the actions page, you'll see a list of actions that are related to the project. Click on the "uncompressed {OS} build" tab that corresponds with your current operating system (like "ezytdl uncompressed windows build").
- You'll see a list of previous workflow runs (if you have any) -- to start building, click on "Run workflow." This will start building the app.
- This will take a while (maybe a couple minutes at most? depends on the target operating system). Once it has completed, it should update automatically -- you can click on the newest run that you performed, and there should be an "Artifacts list" -- download the artifact file that is there. This should be a zip file with the built executable.

### From your own computer:

- Make sure you have [Node.JS](https://nodejs.org/en) (and NPM) installed
- Clone the repository using the git client, or download the ZIP of either the latest release / from source code and extract.
- Install the package dependencies using `npm i` in the terminal.
- If you want to run the program from source code, you can just use `npm start`.
- If you want to *build* a portable program, running `npm run dist` will package up the program into an executable. The resulting package will be found in a newly-created `dist` directory
