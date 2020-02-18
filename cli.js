#!/usr/bin/env node
'use strict';

require('dotenv').config();
const meow = require('meow');
const fikon = require('./scripts/fikon');

const cli = meow(
  `
	Usage
	  $ fikon

	Options
    --token, -t   your Figma personal access token (or set the env var FIGMA_TOKEN)
    --file, -f    the id of the Figma file (found in the URL)
    --page, -p    the Page Name or node id (e.g. "453:89") from where to look for exportable assets
    --output, -o  destination directory, defaults to "assets/icons"

    --compress    compress exported files (svg/jpg/png) using imagemin
    --debug       enable to save the Figma API output as a .json file

	Examples
	  $ fikon --file 1LktYuGGSqZ5zwyDnXJmCA --page Icons --output assets/icons --compress
`,
  {
    flags: {
      token: {
        type: 'string',
        alias: 't',
        default: process.env.FIGMA_TOKEN || '',
      },
      file: {
        type: 'string',
        alias: 'f',
        default: '',
      },
      page: {
        type: 'string',
        alias: 'p',
        default: '',
      },
      output: {
        type: 'string',
        alias: 'o',
        default: 'assets/icons',
      },
      compress: {
        type: 'boolean',
        default: false,
      },
      debug: {
        type: 'boolean',
        default: false,
      },
    },
  }
);

const options = {
  // required: Personal Access Token
  token: cli.flags.token,
  // required: fileId is the URL segment after figma.com/file/<fileId>/some-title
  fileId: cli.flags.file,
  // optional: either case-sensitive page name (eg. "Icons") or node id of your icons document, e.g. "453:8089"
  rootNode: cli.flags.page,
  // optional: folder where icons will be saved to, defaults to "assets/icons" (cannot have subdirectories, see #17)
  output: cli.flags.output,
  compress: cli.flags.compress,
  debug: cli.flags.debug,
};

fikon(options);
