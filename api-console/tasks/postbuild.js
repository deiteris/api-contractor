const fs = require('fs-extra');
const path = require('path');

const assetsPath = path.join('..', 'extension', 'assets', 'api-console')

async function run() {
  const files = await fs.readdir('dist');
  for (const file of files) {
    await fs.copyFile(path.join('dist', file), path.join(assetsPath, file));
  }
}

run();