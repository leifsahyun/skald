# GIMP Scripts

This directory contains GIMP Python-fu scripts for image processing tasks.

## color-adjust.py

A GIMP Python-fu script that applies Color-to-Alpha and Hue-Saturation adjustments to images.

### Features

The script performs the following operations:

1. **Color-to-Alpha**
   - Color: Black (RGB: 0, 0, 0)
   - Transparency Threshold: 0
   - Opacity Threshold: 0

2. **Hue-Saturation Adjustments**
   - Blue channel: Saturation -40, Hue +150
   - Cyan channel: Saturation -100, Lightness +10

### Installation

#### For GIMP 2.x (Python 2):

1. Locate your GIMP plugins directory:
   - **Linux**: `~/.gimp-2.x/plug-ins/` or `~/.config/GIMP/2.x/plug-ins/`
   - **Windows**: `C:\Users\[YourUsername]\.gimp-2.x\plug-ins\`
   - **macOS**: `~/Library/Application Support/GIMP/2.x/plug-ins/`

2. Copy `color-adjust.py` to the plug-ins directory

3. Make the script executable (Linux/macOS):
   ```bash
   chmod +x color-adjust.py
   ```

4. Restart GIMP

#### For GIMP 3.x (Python 3):

1. Locate your GIMP plugins directory:
   - **Linux**: `~/.config/GIMP/3.x/plug-ins/`
   - **Windows**: `C:\Users\[YourUsername]\AppData\Roaming\GIMP\3.x\plug-ins\`
   - **macOS**: `~/Library/Application Support/GIMP/3.x/plug-ins/`

2. Copy `color-adjust.py` to the plug-ins directory

3. Make the script executable (Linux/macOS):
   ```bash
   chmod +x color-adjust.py
   ```

4. Restart GIMP

### Usage

1. Open an image in GIMP
2. Select the layer you want to process
3. Go to **Filters → Skald → Color Adjustments**
4. The adjustments will be applied automatically
5. You can undo all operations with a single undo (Ctrl+Z or Cmd+Z)

### Technical Details

- The script uses the GIMP Procedural Database (PDB) to call built-in filters
- All operations are grouped in a single undo group
- Compatible with RGB and Grayscale images
- Requires a layer with alpha channel for Color-to-Alpha operation

### Requirements

- GIMP 2.x or 3.x
- Python-fu plugin enabled (included by default with GIMP)
