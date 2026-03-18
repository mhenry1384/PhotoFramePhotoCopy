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
];

function isImage(file) {
  const ext = path.extname(file).toLowerCase();
  return imageExtensions.includes(ext);
}

async function scanFolder(source, dest) {
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
  await fs.writeJson(dest, images);
  console.log(`Scanned ${images.length} images and saved to ${dest}`);
}

async function copyImages(sourceFile, destFolder, count, maxWidth, maxHeight) {
  const images = await fs.readJson(sourceFile);
  if (images.length === 0) {
    console.log("No images in source file");
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
      // Copy and resize if needed
      if (
        path.extname(imgPath).toLowerCase() === ".jpg" ||
        path.extname(imgPath).toLowerCase() === ".jpeg"
      ) {
        const metadata = await sharp(imgPath).metadata();
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          // Resize
          await sharp(imgPath)
            // Keep EXIF and other metadata on output images.
            .withMetadata()
            .resize(maxWidth, maxHeight, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .toFile(destPath);
        } else {
          await fs.copy(imgPath, destPath);
        }
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
    "scan <source> <dest>",
    "Scan source folder for images and save list to dest file",
    (yargs) => {
      yargs.positional("source", {
        describe: "Source folder to scan",
        type: "string",
      });
      yargs.positional("dest", {
        describe: "Destination file to save image list",
        type: "string",
      });
    },
    async (argv) => {
      await scanFolder(argv.source, argv.dest);
    },
  )
  .command(
    "copy <source> <dest> <count> <maxWidth> <maxHeight>",
    "Copy random images from source file to dest folder",
    (yargs) => {
      yargs.positional("source", {
        describe: "Source file with image list",
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
