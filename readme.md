# Fikon – export and compress assets from Figma documents

Fikon is a CLI tool that uses the Figma API to export assets like icons and images. All you need to do is define export formats per asset in Figma.

## Install

```bash
$ yarn add --dev fikon
```

## Usage

- Define exports in Figma (sizes like `512w` etc. are not yet supported in the API. Scales like `@2x` work fine)
- Get a personal access token for your figma user account. Either pass it to the CLI or set it as env variable (`FIGMA_TOKEN`)
- Find the file id in the URL (the segment after `/file/`: `figma.com/file/<fileId>/doc-title`)
- Take note of the **Page name** (case sensitive) in the Figma document. It's used as a starting point for finding exportable assets. Alternatively you can pass in a **node id** (e.g. "453:8089") to narrow the search down to children of that node.

The script uses the component name as a file name and creates a version for each export option, appending suffixes and format to the output files.

Component names containing `/` or `.` characters get converted to `_`. Thus, `icon/some.name` with export settings of `svg + @2x png` results in two output files: `icon_some_name.svg` and `icon_some_name@2x.png`.

## CLI

```
$ fikon --help

Options
  --token, -t   your Figma personal access token (or set the env var FIGMA_TOKEN)
  --file, -f    the id of the Figma file (found in the URL)
  --page, -p    the Page Name or node id (e.g. "453:89") from where to look for exportable assets
  --output, -o  destination directory, defaults to "assets/icons"

  --compress    compress exported files (svg/jpg/png) using imagemin
  --debug       enable to save the Figma API output as a .json file

Examples
  $ fikon --file 1LktYuGGSqZ5zwyDnXJmCA --page Icons --output assets/icons --compress
```

## Alternatives

This little utility was put together using [figma-js](https://jongold.github.io/figma-js/), with much inspiration from the following libraries:

- [Figma Assets Generator](figma-assets-generator) – ideal when you want to export assets in a single format.
- [Figmint](https://github.com/tiltshift/figmint) – besides assets, also exports colors and typography, can be used to exctract a styleguide or ui-theme from a Figma file.
