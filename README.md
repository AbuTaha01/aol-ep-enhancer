# AOL-EP-Enhancer

A Chrome extension that enhances the Academy of Learning experience with advanced features including KPI report exports.

## Features

- **KPI Report Export**: Automatically export KPI reports to CSV format using PowerBI Export-to-File REST API
- **Headless Operation**: No new tabs opened - direct CSV download to your Downloads folder
- **Launch Portal Integration**: Seamless integration with Academy of Learning's Launch portal
- **Student Management**: Enhanced student profile and ticket management features

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will be installed and ready to use

## Usage

### KPI Report Export

1. Navigate to the Launch portal
2. Use the extension's KPI report feature
3. The CSV file will be automatically downloaded to your Downloads folder
4. No new tabs or windows will be opened

## Technical Details

- **PowerBI Integration**: Uses Export-to-File REST API for headless CSV export
- **Cloud Backend**: Deployed on Vercel for reliable service
- **Chrome Extension APIs**: Uses downloads, notifications, and storage APIs

## Development

This extension uses:
- Chrome Extension Manifest V3
- PowerBI REST API
- Cloud serverless functions (Vercel)

## License

This project is for Academy of Learning internal use.

## Support

For issues or questions, please contact the development team.
