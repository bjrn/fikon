const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const flatRegex = /\/|\./g;

// replace '/' and '.' with '_' to flatten folder structure
const flattenFolders = (name, char = '_') => name.replace(flatRegex, char);

const saveImage = async (url, fileName, output) => {
  try {
    const response = await fetch(url);
    if (response.status !== 200) return;
    if (!fs.existsSync(output)) {
      fs.mkdirSync(output);
    }
    const file = fs.createWriteStream(`${output}/${fileName}`);
    response.body.pipe(file);
  } catch (e) {
    throw e;
  }
};

const mkDirByPathSync = (targetDir, { isRelativeToScript = false } = {}) => {
  const { sep } = path;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === 'EEXIST') {
        // curDir already exists!
        console.log('curDir already exists!');
        return curDir;
      }
      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }
      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && curDir === path.resolve(targetDir))) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return curDir;
  }, initDir);
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples
const fixCircularReference = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

const circularJSONstringify = json => {
  return JSON.stringify(json, fixCircularReference(), 2);
};

const getAllFiles = function(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      // arrayOfFiles.push(path.join(__dirname, dirPath, file));
      arrayOfFiles.push(path.join(__dirname, '../', dirPath, file));
    }
  });

  return arrayOfFiles;
};

const convertBytes = function(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes == 0) {
    return 'n/a';
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  if (i == 0) {
    return bytes + ' ' + sizes[i];
  }
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

const getFolderSize = function(directoryPath, pretty = false) {
  const arrayOfFiles = getAllFiles(directoryPath);
  let totalSize = 0;
  arrayOfFiles.forEach(function(filePath) {
    totalSize += fs.statSync(filePath).size;
  });
  return pretty ? convertBytes(totalSize) : totalSize;
};

exports.getFolderSize = getFolderSize;
exports.convertBytes = convertBytes;
exports.circularJSONstringify = circularJSONstringify;
exports.mkDirByPathSync = mkDirByPathSync;
exports.saveImage = saveImage;
exports.flattenFolders = flattenFolders;
