# Jira Extras Chrome Extension

A Chrome extension that enhances your Jira experience with productivity features and quality-of-life improvements.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌟 Features

### Core Functionality
- **📋 Story Dashboard** - View all assigned stories organized by status (In-Progress, Backlog, Completed)
- **⚡ Quick Status Updates** - Change story status with an intuitive noUiSlider interface
- **🎯 Assignee Management** - Update story assignees directly from the extension
- **📝 Personal Notes** - Add private notes to stories that persist across sessions
- **🔄 Real-time Sync** - Changes reflect immediately in Jira and update the cache

### User Experience
- **⌨️ Keyboard Navigation** - Use arrow keys (← →) to navigate between stories
- **🌙 Theme Support** - Automatic dark/light theme switching with manual override
- **📱 Responsive Design** - Clean, modern interface that works seamlessly
- **💾 Offline Support** - Cached data allows viewing stories when offline
- **🔗 Context Menu** - Right-click any Jira ticket ID to open it in Jira

### Configuration
- **🔧 Universal Setup** - Works with any Jira instance (Cloud or Server)
- **🍪 Cookie Authentication** - Uses your existing browser session (no additional login)
- **⚙️ Easy Reconfiguration** - Switch between different Jira instances easily

## 🚀 Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/jira-extras.git
   cd jira-extras
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the extension directory

5. The Jira Extras icon should appear in your Chrome toolbar

## ⚙️ Setup

### First Time Configuration
1. Click the Jira Extras icon in your Chrome toolbar
2. Enter your configuration details:
   - **Jira Domain**: Your Jira URL (e.g., `company.atlassian.net`)
   - **Board ID**: Found in your board URL (`/secure/RapidBoard.jspa?rapidView=1234`)
   - **Project Key**: Your project prefix (e.g., `PROJ` from ticket `PROJ-123`)
3. Click "Test Connection" to verify your settings
4. Click "Save & Continue" to complete setup

### Finding Your Configuration Values

**Board ID:**
- Navigate to your Jira board
- Look at the URL: `/secure/RapidBoard.jspa?rapidView=**1234**`
- The number after `rapidView=` is your Board ID

**Project Key:**
- Look at any ticket in your project (e.g., `PROJ-123`)
- The letters before the dash are your Project Key (`PROJ`)

## 🎮 Usage

### Basic Operations
- **View Stories**: Extension automatically loads your assigned stories
- **Open Story Details**: Click any story card to view full details
- **Update Status**: Use the slider in story details to change status
- **Add Notes**: Use the Notes section to add personal reminders
- **Navigate**: Use ← → arrow keys when viewing story details

### Keyboard Shortcuts
- `←` - Previous story
- `→` - Next story
- `Esc` - Close story details (planned feature)

### Context Menu
- Select any Jira ticket ID on any webpage
- Right-click and select "Open in JIRA"
- Ticket opens in a new tab

## 🛠️ Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Cookie-based authentication** (uses your existing Jira session)
- **Local storage caching** for offline support
- **Chrome sync storage** for configuration persistence

### Permissions Required
- `activeTab` - Access current tab for dynamic domain detection
- `contextMenus` - Right-click context menu functionality
- `tabs` - Open Jira links in new tabs
- `storage` - Save configuration and cache data

### File Structure
```
jira-extras/
├── manifest.json
├── popup.html
├── css/
│   └── styles.css
├── javascript/
│   ├── popup.js
│   ├── content.js
│   └── background.js
├── libraries/
│   └── nouislider/
├── images/
└── fonts/
```

## 🔧 Development

### Prerequisites
- Chrome browser
- Basic knowledge of HTML/CSS/JavaScript
- Jira instance access for testing

### Local Development
1. Make your changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Jira Extras extension
4. Test your changes

### Building for Production
The extension is ready to use as-is. For distribution:
1. Zip the entire extension directory
2. Upload to Chrome Web Store
3. Follow Chrome Web Store review process

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow existing code style
- Test thoroughly with different Jira instances
- Update documentation for new features
- Ensure backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**"Get Active Stories not working"**
- Ensure you're logged into Jira in the same browser
- Check that your Board ID and Project Key are correct
- Verify your Jira domain is accessible

**"Connection test fails"**
- Make sure you're logged into Jira
- Check if your Jira domain is correct
- Ensure your browser can access the Jira instance

**"Extension shows config screen every time"**
- Check Chrome's sync storage permissions
- Try reconfiguring the extension
- Clear extension data and reconfigure

### Getting Help
- Check the browser console for error messages
- Verify your Jira permissions
- Ensure you have access to the specified board

## 🗺️ Roadmap

- [ ] Sprint selection and filtering
- [ ] Story creation functionality
- [ ] Bulk operations support
- [ ] Custom field editing
- [ ] Time tracking integration
- [ ] Enhanced search and filtering
- [ ] Export/import settings
- [ ] Multi-board support

## 📞 Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/yourusername/jira-extras/issues) on GitHub.

---

**Made with ❤️ for the Jira community**
