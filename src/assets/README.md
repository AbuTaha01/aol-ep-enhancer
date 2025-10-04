# Signature Image Setup

This extension now uses a pre-configured signature image instead of requiring users to upload it each time.

## How to add your signature image:

1. **Place your signature image file** in this folder (`src/assets/`)
2. **Supported formats**: PNG (recommended) or JPG
3. **File naming**: Use either `signature.png` or `signature.jpg`
4. **Recommended**: Use a transparent PNG for best results
5. **Template**: Use `signature-template.svg` as a starting point (convert to PNG)

## File requirements:
- **Format**: PNG or JPG
- **Size**: Recommended around 180x72 points (2.5" x 1")
- **Transparency**: PNG with transparent background works best
- **Quality**: High resolution (300 DPI recommended)

## What happens:
- Users only need to select PDF files to stamp
- The extension automatically loads your signature image
- No need to upload signature image each time
- Faster and more convenient workflow

## Troubleshooting:
If you get an error "Signature image not found", make sure:
1. Your signature file is named exactly `signature.png` or `signature.jpg`
2. The file is placed in the `src/assets/` folder
3. The file is a valid image format
4. You've reloaded the extension after adding the file
