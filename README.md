# Photo Frame Photo Copy

A Node.js application for managing images: scanning folders, copying random selections with resizing, and cleaning folders.

## Installation

1. Install Node.js (version 14 or higher).
2. Clone or download this repository.
3. Run `npm install` to install dependencies.

## Usage

The application accepts a JSON config file named `config.json` in the root directory (optional).

### Commands

#### Scan

Scan a folder and subfolders for images and save the list to a JSON file.

```
node index.js scan <source_folder> <dest_file>
```

Example:

```
node index.js scan /path/to/photos images.json
```

#### Copy

Copy a random selection of images from a JSON list to a folder, resizing JPGs if necessary.

```
node index.js copy <source_file> <dest_folder> <count> <maxWidth> <maxHeight>
```

Example:

```
node index.js copy images.json /path/to/output 10 1920 1080
```

#### Clean

Remove all files in the root of a folder.

```
node index.js clean <dest_folder>
```

Example:

```
node index.js clean /path/to/output
```

### Windows Batch Files

- `scan.bat`: Run `scan.bat "C:\source" "images.json"`
- `copy.bat`: Run `copy.bat "images.json" "C:\output" 5 800 600`
- `clean.bat`: Run `clean.bat "C:\output"`

## Supported Image Formats

- JPG, JPEG, PNG, GIF, BMP, TIFF, WebP

## Dependencies

- sharp: For image resizing
- yargs: For command-line parsing
- fs-extra: For enhanced file operations
