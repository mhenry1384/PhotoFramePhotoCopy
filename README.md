# Photo Frame Photo Copy

A Node.js tool that randomly selects photos from a source folder tree, optionally resizes them, and copies them to a destination folder — suitable for populating a digital photo frame.

## Installation

1. Install [Node.js](https://nodejs.org/) (v14 or higher)
2. Clone this repository
3. Run `npm install`

## Commands

### copy

Scan a source folder recursively for images, pick a random selection, and copy them to a destination folder.

```
node index.js copy <source_folder> <dest_folder> <count> <maxWidth> <maxHeight>
```

| Argument | Description |
|---|---|
| `source_folder` | Folder tree to scan for images |
| `dest_folder` | Folder to copy selected images into |
| `count` | Number of images to copy |
| `maxWidth` | Maximum output width in pixels (JPEGs only) |
| `maxHeight` | Maximum output height in pixels (JPEGs only) |

**Example:**
```
node index.js copy "C:\Photos" "C:\Frame" 50 1920 1080
```

JPEG files are resized to fit within `maxWidth`×`maxHeight` if they exceed those dimensions (aspect ratio preserved, never upscaled). All other formats are copied as-is.

#### EXIF handling (JPEG)

- All existing EXIF metadata is preserved, including `DateTimeOriginal`.
- The `ImageDescription` field is set to the relative path of the source file within `source_folder` (e.g. `2024/Vacation/beach.jpg`).

### clean

Remove all files from a folder (does not recurse into subdirectories).

```
node index.js clean <dest_folder>
```

**Example:**
```
node index.js clean "C:\Frame"
```

## Windows Batch Files

- `copy.bat <source_folder> <dest_folder> <count> <maxWidth> <maxHeight>`
- `clean.bat <dest_folder>`

## Supported Image Formats

JPG, JPEG, PNG, GIF, BMP, TIFF, WebP

## Dependencies

| Package | Purpose |
|---|---|
| [sharp](https://sharp.pixelplumbing.com/) | JPEG resizing and EXIF handling |
| [yargs](https://yargs.js.org/) | Command-line argument parsing |
| [fs-extra](https://github.com/jprichardson/node-fs-extra) | Enhanced file system operations |
