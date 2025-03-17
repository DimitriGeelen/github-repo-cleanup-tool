document.addEventListener('DOMContentLoaded', function() {
    // OAuth Configuration
    const GITHUB_CLIENT_ID = ''; // Add your client ID here
    const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname;
    const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=repo,delete_repo`;
    
    // DOM Elements - Tabs
    const oauthTabBtn = document.getElementById('oauth-tab-btn');
    const tokenTabBtn = document.getElementById('token-tab-btn');
    const oauthLoginDiv = document.getElementById('oauth-login');
    const tokenLoginDiv = document.getElementById('token-login');
    
    // DOM Elements - Authentication
    const tokenInput = document.getElementById('token-input');
    const tokenLoginBtn = document.getElementById('token-login-btn');
    const oauthLoginBtn = document.getElementById('oauth-login-btn');
    
    // DOM Elements - Repositories
    const refreshBtn = document.getElementById('refresh-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const deselectAllBtn = document.getElementById('deselect-all-btn');
    const filterInput = document.getElementById('filter-repos');
    const repoList = document.getElementById('repo-list');
    const downloadBtn = document.getElementById('download-btn');
    const deleteBtn = document.getElementById('delete-btn');
    
    // DOM Elements - Modals
    const statusMessage = document.getElementById('status-message');
    const confirmationModal = document.getElementById('confirmation-modal');
    const reposToDeleteList = document.getElementById('repos-to-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete');

    // State
    let token = '';
    let repositories = [];
    let selectedRepos = new Set();
    let downloadQueue = [];
    let deleteQueue = [];

    // Tab Switching
    oauthTabBtn.addEventListener('click', function() {
        oauthTabBtn.classList.add('active');
        tokenTabBtn.classList.remove('active');
        oauthLoginDiv.classList.add('active');
        tokenLoginDiv.classList.remove('active');
    });
    
    tokenTabBtn.addEventListener('click', function() {
        tokenTabBtn.classList.add('active');
        oauthTabBtn.classList.remove('active');
        tokenLoginDiv.classList.add('active');
        oauthLoginDiv.classList.remove('active');
    });

    // Event Listeners - Authentication
    tokenLoginBtn.addEventListener('click', handleTokenLogin);
    oauthLoginBtn.addEventListener('click', handleOAuthLogin);
    
    // Event Listeners - Repositories
    refreshBtn.addEventListener('click', fetchRepositories);
    selectAllBtn.addEventListener('click', selectAllRepos);
    deselectAllBtn.addEventListener('click', deselectAllRepos);
    filterInput.addEventListener('input', filterRepositories);
    downloadBtn.addEventListener('click', downloadSelectedRepos);
    deleteBtn.addEventListener('click', showDeleteConfirmation);
    
    // Event Listeners - Modals
    cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    confirmDeleteBtn.addEventListener('click', deleteSelectedRepos);

    // Check for token in local storage or OAuth code in URL
    initializeAuthentication();
    
    // Functions - Initialization
    function initializeAuthentication() {
        // Check for OAuth code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            handleOAuthCallback(code);
        } else {
            // Check for token in local storage
            const savedToken = localStorage.getItem('gh-cleanup-token');
            if (savedToken) {
                token = savedToken;
                validateToken(token);
            }
        }
    }

    // Functions - Authentication
    function handleOAuthLogin() {
        window.location.href = GITHUB_AUTH_URL;
    }
    
    async function handleOAuthCallback(code) {
        showStatus('Exchanging code for token...', 'success');
        
        try {
            // Exchange the code for a token using our server endpoint
            const response = await fetch('/api/exchange-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            
            if (!response.ok) {
                throw new Error('Failed to exchange code for token');
            }
            
            const data = await response.json();
            
            if (data.access_token) {
                token = data.access_token;
                localStorage.setItem('gh-cleanup-token', token);
                validateToken(token);
            } else if (data.error) {
                throw new Error(data.error_description || data.error);
            } else {
                throw new Error('No token received from GitHub');
            }
        } catch (error) {
            showStatus(`OAuth authentication failed: ${error.message}. Try token authentication instead.`, 'error');
        }
    }
    
    async function handleTokenLogin() {
        token = tokenInput.value.trim();
        if (!token) {
            showStatus('Please enter a valid GitHub token', 'error');
            return;
        }
        
        validateToken(token);
    }
    
    async function validateToken(tokenToValidate) {
        try {
            // Test token by fetching user info
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${tokenToValidate}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Invalid token or API request failed');
            }

            const userData = await response.json();
            showStatus(`Successfully logged in as ${userData.login}`, 'success');
            
            // Save token to local storage
            localStorage.setItem('gh-cleanup-token', tokenToValidate);
            token = tokenToValidate;
            
            // Enable controls
            enableControls();
            
            // Fetch repositories
            fetchRepositories();
        } catch (error) {
            showStatus(`Login failed: ${error.message}`, 'error');
            localStorage.removeItem('gh-cleanup-token');
        }
    }

    function enableControls() {
        refreshBtn.disabled = false;
        selectAllBtn.disabled = false;
        deselectAllBtn.disabled = false;
        filterInput.disabled = false;
    }

    // Functions - Repository Management
    async function fetchRepositories() {
        showStatus('Fetching repositories...', 'success');
        repositories = [];
        selectedRepos.clear();
        updateButtons();

        try {
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}`, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch repositories');
                }

                const repos = await response.json();
                if (repos.length === 0) {
                    hasMore = false;
                } else {
                    repositories = [...repositories, ...repos];
                    page++;
                }
            }

            renderRepositories();
            showStatus(`Found ${repositories.length} repositories`, 'success');
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    function renderRepositories() {
        if (repositories.length === 0) {
            repoList.innerHTML = '<p class="empty-state">No repositories found</p>';
            return;
        }

        repoList.innerHTML = '';
        
        repositories.forEach(repo => {
            const repoItem = document.createElement('div');
            repoItem.className = 'repo-item';
            repoItem.dataset.name = repo.name;
            repoItem.dataset.fullName = repo.full_name;
            repoItem.dataset.id = repo.id;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'repo-checkbox';
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    selectedRepos.add(repo.full_name);
                } else {
                    selectedRepos.delete(repo.full_name);
                }
                updateButtons();
            });

            const repoInfo = document.createElement('div');
            repoInfo.className = 'repo-info';

            const repoName = document.createElement('div');
            repoName.className = 'repo-name';
            repoName.textContent = repo.name;

            const repoDescription = document.createElement('div');
            repoDescription.className = 'repo-description';
            repoDescription.textContent = repo.description || 'No description';

            const repoMeta = document.createElement('div');
            repoMeta.className = 'repo-meta';
            repoMeta.textContent = `Updated: ${new Date(repo.updated_at).toLocaleDateString()} | Language: ${repo.language || 'Not specified'}`;

            repoInfo.appendChild(repoName);
            repoInfo.appendChild(repoDescription);
            repoInfo.appendChild(repoMeta);

            repoItem.appendChild(checkbox);
            repoItem.appendChild(repoInfo);
            repoList.appendChild(repoItem);
        });
    }

    function filterRepositories() {
        const filterText = filterInput.value.toLowerCase();
        const repoItems = repoList.querySelectorAll('.repo-item');

        repoItems.forEach(item => {
            const repoName = item.dataset.name.toLowerCase();
            if (repoName.includes(filterText)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function selectAllRepos() {
        const visibleRepos = Array.from(repoList.querySelectorAll('.repo-item'))
            .filter(item => item.style.display !== 'none');

        visibleRepos.forEach(item => {
            const checkbox = item.querySelector('.repo-checkbox');
            checkbox.checked = true;
            selectedRepos.add(item.dataset.fullName);
        });

        updateButtons();
    }

    function deselectAllRepos() {
        const checkboxes = repoList.querySelectorAll('.repo-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedRepos.clear();
        updateButtons();
    }

    function updateButtons() {
        const hasSelected = selectedRepos.size > 0;
        downloadBtn.disabled = !hasSelected;
        deleteBtn.disabled = !hasSelected;
    }

    // Functions - Repository Actions
    async function downloadSelectedRepos() {
        if (selectedRepos.size === 0) {
            showStatus('No repositories selected', 'error');
            return;
        }

        downloadQueue = Array.from(selectedRepos);
        showStatus(`Preparing to download ${downloadQueue.length} repositories...`, 'success');
        processDownloadQueue();
    }

    async function processDownloadQueue() {
        if (downloadQueue.length === 0) {
            showStatus('All repositories downloaded successfully', 'success');
            return;
        }

        const repoFullName = downloadQueue.shift();
        showStatus(`Downloading ${repoFullName}...`, 'success');

        try {
            // Create download link for repository
            const [owner, repo] = repoFullName.split('/');
            const downloadUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/main`;
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${repo}.zip`);
            
            // Add authorization token to download link
            const xhr = new XMLHttpRequest();
            xhr.open('GET', downloadUrl);
            xhr.setRequestHeader('Authorization', `token ${token}`);
            xhr.responseType = 'blob';
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const blob = xhr.response;
                    const url = window.URL.createObjectURL(blob);
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    // Continue with next download after a short delay
                    setTimeout(() => processDownloadQueue(), 1000);
                } else {
                    throw new Error(`Failed to download ${repoFullName}`);
                }
            };
            
            xhr.onerror = function() {
                showStatus(`Error downloading ${repoFullName}. Continuing with next...`, 'error');
                // Continue with next download even if one fails
                processDownloadQueue();
            };
            
            xhr.send();
        } catch (error) {
            showStatus(`Error downloading ${repoFullName}: ${error.message}. Continuing with next...`, 'error');
            // Continue with next download even if one fails
            processDownloadQueue();
        }
    }

    function showDeleteConfirmation() {
        if (selectedRepos.size === 0) {
            showStatus('No repositories selected', 'error');
            return;
        }

        reposToDeleteList.innerHTML = '';
        deleteQueue = Array.from(selectedRepos);
        
        deleteQueue.forEach(repoName => {
            const listItem = document.createElement('li');
            listItem.textContent = repoName;
            reposToDeleteList.appendChild(listItem);
        });

        confirmationModal.style.display = 'flex';
    }

    function hideDeleteConfirmation() {
        confirmationModal.style.display = 'none';
    }

    async function deleteSelectedRepos() {
        hideDeleteConfirmation();
        if (deleteQueue.length === 0) {
            showStatus('No repositories selected for deletion', 'error');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const repoFullName of deleteQueue) {
            try {
                showStatus(`Deleting ${repoFullName}...`, 'success');
                const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.status === 204) {
                    successCount++;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Unknown error');
                }
            } catch (error) {
                failCount++;
                showStatus(`Error deleting ${repoFullName}: ${error.message}`, 'error');
            }
        }

        showStatus(`Deletion completed: ${successCount} succeeded, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
        
        // Refresh repository list
        if (successCount > 0) {
            selectedRepos.clear();
            fetchRepositories();
        }
    }

    // Helper Functions
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message';
        statusMessage.classList.add(type);
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
    }
});