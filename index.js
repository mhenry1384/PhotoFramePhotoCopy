const fs = require("fs-extra");
const path = require("path");
const sharp = require("sharp");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

// Load config if exists
let config = {};
try {
  config = fs.readJsonSync("config.json");
} catch (e) {
  // No config, use defaults
}

// Image extensions
const imageExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tiff",
  ".webp",
  ".heic",
];

function isImage(file) {
  const ext = path.extname(file).toLowerCase();
  return imageExtensions.includes(ext);
}

async function addGifComment(filePath, comment) {
  const data = await fs.readFile(filePath);
  // Skip header (6) + logical screen descriptor (7)
  let offset = 13;
  if (data[10] & 0x80) {
    offset += 3 * Math.pow(2, (data[10] & 0x07) + 1);
  }
  const commentBytes = Buffer.from(comment, "ascii");
  const subBlocks = [];
  for (let i = 0; i < commentBytes.length; i += 255) {
    const chunk = commentBytes.subarray(i, i + 255);
    subBlocks.push(Buffer.from([chunk.length]), chunk);
  }
  const commentBlock = Buffer.concat([
    Buffer.from([0x21, 0xfe]),
    ...subBlocks,
    Buffer.from([0x00]),
  ]);
  await fs.writeFile(
    filePath,
    Buffer.concat([data.subarray(0, offset), commentBlock, data.subarray(offset)]),
  );
}

async function scanFolder(source) {
  const images = [];
  async function scan(dir) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await scan(fullPath);
      } else if (isImage(item)) {
        images.push(fullPath);
      }
    }
  }
  await scan(source);
  return images;
}

async function copyImages(sourceFolder, destFolder, count, maxWidth, maxHeight) {
  const images = await scanFolder(sourceFolder);
  if (images.length === 0) {
    console.log("No images found in source folder");
    return;
  }
  // Shuffle and take count
  const shuffled = images.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, images.length));

  for (const imgPath of selected) {
    const filename = path.basename(imgPath);
    let destPath = path.join(destFolder, filename);
    let counter = 1;
    while (await fs.pathExists(destPath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      destPath = path.join(destFolder, `${name}_${counter}${ext}`);
      counter++;
    }

    try {
      const ext = path.extname(imgPath).toLowerCase();
      const relativePath = path.relative(sourceFolder, imgPath).replace(/\\/g, "/");
      if (ext === ".jpg" || ext === ".jpeg") {
        const metadata = await sharp(imgPath).metadata();
        const pipeline = sharp(imgPath).withMetadata({
          exif: { IFD0: { ImageDescription: relativePath } },
        });
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          await pipeline
            .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
            .toFile(destPath);
        } else {
          await pipeline.toFile(destPath);
        }
      } else if (ext === ".png") {
        await sharp(imgPath)
          .withMetadata({ exif: { IFD0: { ImageDescription: relativePath } } })
          .toFile(destPath);
      } else if (ext === ".gif") {
        await fs.copy(imgPath, destPath);
        await addGifComment(destPath, relativePath);
      } else {
        await fs.copy(imgPath, destPath);
      }

      console.log(`Copied ${imgPath} to ${destPath}`);
    } catch (error) {
      console.error(`Failed to process image: ${imgPath}`);
      console.error(error);
    }
  }
}

async function cleanFolder(destFolder) {
  const items = await fs.readdir(destFolder);
  for (const item of items) {
    const fullPath = path.join(destFolder, item);
    const stat = await fs.stat(fullPath);
    if (stat.isFile()) {
      await fs.unlink(fullPath);
    }
  }
  console.log(`Cleaned ${destFolder}`);
}

const argv = yargs(hideBin(process.argv))
  .command(
    "copy <source> <dest> <count> <maxWidth> <maxHeight>",
    "Copy random images from source folder to dest folder",
    (yargs) => {
      yargs.positional("source", {
        describe: "Source folder to scan for images",
        type: "string",
      });
      yargs.positional("dest", {
        describe: "Destination folder",
        type: "string",
      });
      yargs.positional("count", {
        describe: "Number of images to copy",
        type: "number",
      });
      yargs.positional("maxWidth", {
        describe: "Max width for JPG images",
        type: "number",
      });
      yargs.positional("maxHeight", {
        describe: "Max height for JPG images",
        type: "number",
      });
    },
    async (argv) => {
      await copyImages(
        argv.source,
        argv.dest,
        argv.count,
        argv.maxWidth,
        argv.maxHeight,
      );
    },
  )
  .command(
    "clean <dest>",
    "Remove all files in dest folder",
    (yargs) => {
      yargs.positional("dest", {
        describe: "Destination folder to clean",
        type: "string",
      });
    },
    async (argv) => {
      await cleanFolder(argv.dest);
    },
  )
  .help()
  .demandCommand(
    1,
    "You need to specify a command. Use --help for more info.",
  ).argv;
