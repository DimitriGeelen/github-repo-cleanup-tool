# GitHub Repository Cleanup Tool

A simple web tool to manage your GitHub repositories. This tool allows you to:

- List all your GitHub repositories
- Select multiple repositories
- Download selected repositories before deletion
- Delete selected repositories

## Usage

1. Open `index.html` in your web browser
2. Choose an authentication method:
   - OAuth login (recommended for most users)
   - Personal Access Token login (for advanced users)
3. Select repositories you want to manage
4. Use the Download button to save a copy before deletion
5. Use the Delete button to remove unwanted repositories

## Authentication Options

### OAuth Authentication (Recommended)

OAuth authentication provides a secure way to authenticate with GitHub without storing your token:

1. Click the "Login with GitHub" button
2. Approve the permissions in the GitHub authorization page
3. You'll be redirected back to the application automatically

⚠️ **Important**: To use OAuth authentication, you need to:
1. [Register a GitHub OAuth App](https://github.com/settings/applications/new)
2. Set the homepage URL to where you'll host this tool
3. Set the callback URL to the same location
4. Update the `GITHUB_CLIENT_ID` variable in `app.js` with your OAuth App's client ID

### Personal Access Token Authentication

For users who prefer using a token directly:

1. Generate a GitHub personal access token (see below)
2. Enter your token in the input field
3. Click "Login"

## Features

- **Multiple Authentication Methods**: Choose between OAuth or token-based authentication
- **Repository Listing**: View all your repositories with descriptions and metadata
- **Filtering**: Filter repositories by name to quickly find what you're looking for
- **Batch Selection**: Select/deselect all visible repositories with a single click
- **Safe Deletion**: Download repositories before deleting them
- **Confirmation**: Confirm deletion with a list of repositories to be deleted
- **Persistence**: Authentication information saved for convenience

## Security Notes

- Your GitHub token is stored only in your browser's local storage
- No data is sent to any third-party servers
- The application runs entirely in your browser

## Required Permissions

The tool requires these GitHub permissions:
- `repo` (to access repositories)
- `delete_repo` (to delete repositories)

## How to Create a GitHub Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token"
3. Add a note (e.g., "Repository Cleanup Tool")
4. Select the required scopes: `repo` and `delete_repo`
5. Click "Generate token"
6. Copy the token and use it in the application

## Technical Details

This is a pure frontend application using:
- HTML/CSS/JavaScript
- GitHub REST API v3
- No external libraries or frameworks

## Hosting Instructions

To use OAuth authentication, you need to host this application somewhere (GitHub Pages, your own server, etc.)

### GitHub Pages Setup:

1. Enable GitHub Pages in your repository settings
2. Set it to serve from the main branch
3. Register an OAuth application with the correct callback URL
4. Update the `GITHUB_CLIENT_ID` in `app.js`

## Limitations

- The GitHub API has rate limits that may affect large operations
- Repository downloads are triggered as ZIP files via the GitHub API
- Some browsers may block multiple downloads - you may need to allow them
- OAuth flow requires setting up your own GitHub OAuth App

## Local Development

To modify or extend this tool:

1. Clone the repository
2. Make your changes to the HTML, CSS, or JavaScript files
3. Open index.html in your browser to test

No build process is needed as the tool uses vanilla JavaScript.

## License

MIT License - Feel free to use, modify, and distribute this tool.
