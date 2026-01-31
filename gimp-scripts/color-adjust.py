#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GIMP Python-fu script to apply Color-to-Alpha and Hue-Saturation adjustments.

This script performs the following operations:
1. Color-to-Alpha with Black color and thresholds set to 0
2. Hue-Saturation adjustments:
   - Blue channel: Saturation -40, Hue +150
   - Cyan channel: Saturation -100, Lightness +10
"""

from gimpfu import *

def apply_color_adjustments(image, drawable):
    """
    Apply color-to-alpha and hue-saturation adjustments to the active layer.
    
    Args:
        image: The GIMP image object
        drawable: The active drawable (layer)
    """
    
    # Start an undo group to allow all operations to be undone together
    pdb.gimp_image_undo_group_start(image)
    
    try:
        # Step 1: Apply Color-to-Alpha
        # Color: Black (RGB: 0, 0, 0)
        # Transparency Threshold: 0
        # Opacity Threshold: 0
        black_color = (0, 0, 0)
        pdb.plug_in_colortoalpha(image, drawable, black_color)
        
        # Step 2: Apply Hue-Saturation adjustments
        # GIMP's hue-saturation function takes these parameters:
        # - image: the image
        # - drawable: the drawable/layer
        # - hue_range: 0=ALL, 1=RED, 2=YELLOW, 3=GREEN, 4=CYAN, 5=BLUE, 6=MAGENTA
        # - hue_offset: -180 to 180
        # - lightness: -100 to 100
        # - saturation: -100 to 100
        
        # Blue channel: Saturation -40, Hue +150
        pdb.gimp_hue_saturation(image, drawable, 5, 150, 0, -40)
        
        # Cyan channel: Saturation -100, Lightness +10
        pdb.gimp_hue_saturation(image, drawable, 4, 0, 10, -100)
        
        # Update the display
        pdb.gimp_displays_flush()
        
    finally:
        # End the undo group
        pdb.gimp_image_undo_group_end(image)


# Register the plugin with GIMP
register(
    "python_fu_color_adjust",
    "Apply Color-to-Alpha and Hue-Saturation adjustments",
    "Applies Color-to-Alpha with black color and specific Hue-Saturation settings to Blue and Cyan channels",
    "Skald Project",
    "Skald Project",
    "2026",
    "<Image>/Filters/Skald/Color Adjustments",
    "RGB*, GRAY*",
    [],
    [],
    apply_color_adjustments
)

main()
