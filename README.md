# ESP32 Power Tracker

⚡ Daily Power Consumption Tracker with Notification Alerts

A web-based application for monitoring and controlling ESP32-connected power loads with real-time WebSocket communication.

## Features

- **Real-time Monitoring**: Track voltage, current, power, and energy consumption for up to 4 loads
- **Remote Control**: Switch relays on/off remotely via web interface
- **Timer Auto-OFF**: Set automatic shutoff timers for loads
- **Usage Limits**: Configure daily usage limits (hours per day) for each load
- **Notifications**: Receive alerts for important events
- **Charts & Reports**: Visualize power consumption data
- **PDF Export**: Download power consumption logs as PDF

## Files

- `index.html` - Login page with authentication
- `data.html` - Main dashboard for power monitoring and control
- `app.js` - WebSocket client and application logic
- `login.css` - Styles for login page
- `styles.css` - Styles for main dashboard

## GitHub Actions Workflows

This project includes two GitHub Actions workflows:

### CI Workflow (`ci.yml`)
Runs on every push and pull request to the main branch:
- Validates HTML files for proper structure
- Checks CSS files for syntax
- Validates JavaScript files for syntax errors
- Generates a validation summary

### Deploy Workflow (`deploy.yml`)
Automatically deploys the application to GitHub Pages:
- Runs on every push to the main branch
- Can be manually triggered via workflow_dispatch
- Deploys all files to GitHub Pages

## Development

The application uses:
- WebSocket for real-time communication with ESP32
- Chart.js for data visualization
- jsPDF for PDF generation

## Valid Login Credentials

- naresh@gmail.com / 12345678
- sanjai@gmail.com / 12345678
- mouli@gmail.com / 12345678
- nivas@gmail.com / 12345678
- shathi@gmail.com / 12345678

## License

© Nareshkumar
