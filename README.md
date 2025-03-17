# GitHub Repository Cleanup Tool

A simple web tool to manage your GitHub repositories. This tool allows you to:

- List all your GitHub repositories
- Select multiple repositories
- Download selected repositories before deletion
- Delete selected repositories

## Usage

1. Open `index.html` in your web browser
2. Enter your GitHub personal access token
3. Select repositories you want to manage
4. Use the Download button to save a copy before deletion
5. Use the Delete button to remove unwanted repositories

## Features

- **Authentication**: Securely authenticate with GitHub using a personal access token
- **Repository Listing**: View all your repositories with descriptions and metadata
- **Filtering**: Filter repositories by name to quickly find what you're looking for
- **Batch Selection**: Select/deselect all visible repositories with a single click
- **Safe Deletion**: Download repositories before deleting them
- **Confirmation**: Confirm deletion with a list of repositories to be deleted
- **Persistence**: Token saved in local storage for convenience

## Security Notes

- Your GitHub token is stored only in your browser's local storage
- No data is sent to any third-party servers
- The application runs entirely in your browser

## Required Token Permissions

Your GitHub personal access token needs these scopes:
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

## Limitations

- The GitHub API has rate limits that may affect large operations
- Repository downloads are triggered as ZIP files via the GitHub API
- Some browsers may block multiple downloads - you may need to allow them

## Local Development

To modify or extend this tool:

1. Clone the repository
2. Make your changes to the HTML, CSS, or JavaScript files
3. Open index.html in your browser to test

No build process is needed as the tool uses vanilla JavaScript.

## License

MIT License - Feel free to use, modify, and distribute this tool.
