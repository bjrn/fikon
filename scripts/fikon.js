const Figma = require('figma-js');
const Listr = require('listr');
const fs = require('fs');
const minify = require('./minify');
const {
  saveImage,
  mkDirByPathSync,
  flattenFolders,
  circularJSONstringify,
  getFolderSize,
  convertBytes,
} = require('./fileUtils');

function getFigmaClient(personalAccessToken) {
  return Figma.Client({ personalAccessToken });
}

async function getFigmaFile(client, fileId) {
  const file = await client.file(fileId);
  return file;
}

function getFigmaUrl(fileId) {
  return `https://www.figma.com/file/${fileId}/`;
}

// figure out root node and use it for deriving child nodes
function getRootNode(file, id) {
  const pages = file.data.document.children;
  let result = null;
  if (id) {
    result = pages.find(node => node.name === id || node.id === id);
  }
  if (!result || !result.children) {
    return pages;
  }
  return result;
}

function _collectExportableNodes(collection, item) {
  if (!!item.exportSettings && !!item.name) {
    collection.push(item);
  }
  if (item.children) {
    item.children.reduce(_collectExportableNodes, collection);
  }
  return collection;
}

function getExportableNodes(rootNode) {
  const startAt = rootNode.length ? rootNode : rootNode.children;
  const nodes = startAt.reduce(_collectExportableNodes, []);
  return nodes;
}

function groupAssetsByFormat(nodes) {
  const nodesByFormat = {};
  nodes.forEach(node => {
    node.exportSettings.forEach(opt => {
      const format = opt.format.toLowerCase();
      const scale = (opt.constraint && opt.constraint.value) || 1;
      const key = `${format}${scale}`;
      const suffix = opt.suffix || '';
      const { id, name } = node;
      const obj = { id, name, suffix, format, scale };
      if (!nodesByFormat[key]) {
        nodesByFormat[key] = [];
      }
      nodesByFormat[key].push(obj);
    });
  });
  return nodesByFormat;
}

async function getImageUrls(getFn, nodes) {
  const assetsByFormat = groupAssetsByFormat(nodes);
  let assets = [];
  for (key in assetsByFormat) {
    const group = assetsByFormat[key] || [];
    const { format, scale } = group[0];
    const ids = group.map(node => node.id);
    try {
      const response = await getFn({ ids, format, scale });
      if (response.data.err) {
        throw new Error(`response.data.err:\n${response.data.err}`);
      }

      const { images } = response.data;
      assets = assets.concat(
        group.map(asset => {
          if (images.hasOwnProperty(asset.id)) {
            asset.url = images[asset.id];
            return asset;
          }
        })
      );
    } catch (e) {
      throw new Error(e);
    }
  }
  return assets;
}

const taskItems = [
  {
    title: 'Connect to Figma',
    task: (ctx, task) => {
      ctx.client = getFigmaClient(ctx.options.token);
    },
  },
  {
    title: 'Reading file …',
    task: async (ctx, task) => {
      const fileId = ctx.options.fileId;
      ctx.file = await getFigmaFile(ctx.client, fileId);
      task.title = `Reading file ${getFigmaUrl(fileId)}`;
    },
  },
  {
    title: 'Debug: Save json file for reference',
    enabled: ctx => !!ctx.options.debug,
    task: (ctx, task) => {
      const filename = `./figma-debug-${ctx.options.fileId}.json`;
      fs.writeFile(filename, circularJSONstringify(ctx.file), e => {
        if (e) {
          throw new Error(e);
        }
      });
    },
  },
  {
    title: 'Find exportable assets',
    task: (ctx, task) => {
      ctx.rootNode = getRootNode(ctx.file, ctx.options.rootNode);
      ctx.nodes = getExportableNodes(ctx.rootNode) || [];
      if (!ctx.nodes.length) {
        throw new Error('No exportable assets found.');
      }
      task.title = `Found ${ctx.nodes.length} exportable assets`;
    },
  },
  {
    title: 'Get urls for all export formats',
    skip: ctx => !ctx.nodes.length && 'no exportable assets found',
    task: async (ctx, task) => {
      const getter = async opts => {
        try {
          return await ctx.client.fileImages(ctx.options.fileId, opts);
        } catch (e) {
          throw new Error(`couldn't get asset from figma`, e);
        }
      };
      try {
        const assets = await getImageUrls(getter, ctx.nodes);
        task.title = `Got ${assets.length} image urls`;
        ctx.assets = assets;
      } catch (e) {
        throw new Error(e);
      }
    },
  },
  {
    title: 'Save images',
    task: async (ctx, task) => {
      const {
        assets,
        options: { output },
      } = ctx;
      task.title = `Save ${assets.length} images to '${output}'`;
      try {
        mkDirByPathSync(output);
        await assets.forEach(async (item, idx) => {
          const { url, name = '', suffix = '', format = '' } = item;
          // replace '/' with '_' to flatten folder structure
          const filename = `${flattenFolders(name)}${suffix}.${format}`;
          return await saveImage(url, filename, output);
        });
        task.title = `Saved ${assets.length} images to '${output}'`;
      } catch (e) {
        throw new Error(e + '\nError saving images to filesystem');
      }
    },
  },
  {
    title: 'Minify image assets',
    enabled: ctx => !!ctx.options.compress,
    skip: ctx => !ctx.assets || (!ctx.assets.length && 'no images to minify'),
    task: async (ctx, task) => {
      const dir = ctx.options.output;
      try {
        const before = getFolderSize(dir);
        await minify(dir);
        const after = getFolderSize(dir);
        const percentage = Math.round((1 - after / before) * 10000) / 100;
        task.title = [
          'Minified images:',
          convertBytes(before),
          '->',
          convertBytes(after),
          `(${percentage}%)`,
        ].join(' ');
      } catch (e) {
        throw new Error(e + '\nError minifying assets using imagemin');
      }
    },
  },
];

const tasks = new Listr(taskItems);

async function getFigmaAssets(options) {
  await tasks.run({ options });
}

module.exports = getFigmaAssets;
