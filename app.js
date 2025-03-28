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
    let currentUser = null;

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
            // Show loading status
            showStatus('Validating GitHub token...', 'success');
            
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
            currentUser = userData;
            
            // Check if the token has the required scopes
            const scopes = response.headers.get('X-OAuth-Scopes') || '';
            const hasRepoScope = scopes.includes('repo');
            const hasDeleteScope = scopes.includes('delete_repo');
            
            if (!hasRepoScope || !hasDeleteScope) {
                let missingScopes = [];
                if (!hasRepoScope) missingScopes.push('repo');
                if (!hasDeleteScope) missingScopes.push('delete_repo');
                
                const warning = `Warning: Your token is missing required scopes: ${missingScopes.join(', ')}. Some operations may fail.`;
                showStatus(warning, 'error');
                console.warn(warning);
            }
            
            // Create success login message with user info
            const loginMessage = createLoginSuccessMessage(userData);
            showStatus(loginMessage, 'success');
            
            // Save token to local storage
            localStorage.setItem('gh-cleanup-token', tokenToValidate);
            token = tokenToValidate;
            
            // Enable controls
            enableControls();
            
            // Update UI with user info
            updateUserInfo(userData);
            
            // Fetch repositories
            fetchRepositories();
        } catch (error) {
            showStatus(`Login failed: ${error.message}`, 'error');
            localStorage.removeItem('gh-cleanup-token');
        }
    }
    
    function createLoginSuccessMessage(userData) {
        const username = userData.login;
        const name = userData.name || username;
        const repoCount = userData.public_repos + (userData.owned_private_repos || 0);
        
        return `Successfully logged in as ${name} (@${username}). You have access to ${repoCount} repositories.`;
    }
    
    function updateUserInfo(userData) {
        // Check if user info section already exists, if not create it
        let userInfoSection = document.getElementById('user-info-section');
        
        if (!userInfoSection) {
            // Create user info section
            userInfoSection = document.createElement('section');
            userInfoSection.id = 'user-info-section';
            userInfoSection.className = 'user-info-section';
            
            // Insert after auth section
            const authSection = document.querySelector('.auth-section');
            authSection.parentNode.insertBefore(userInfoSection, authSection.nextSibling);
        }
        
        // Populate user info section
        const avatarUrl = userData.avatar_url;
        const username = userData.login;
        const name = userData.name || username;
        const repoCount = userData.public_repos + (userData.owned_private_repos || 0);
        
        userInfoSection.innerHTML = `
            <div class="user-profile">
                <img src="${avatarUrl}" alt="${username}" class="user-avatar">
                <div class="user-details">
                    <h3>${name}</h3>
                    <p>@${username}</p>
                    <p>${repoCount} repositories</p>
                </div>
            </div>
        `;
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
        
        // Clear the current repository list and show loading indicator
        repoList.innerHTML = '<p class="empty-state">Loading repositories...</p>';

        try {
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, {
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
            repoList.innerHTML = '<p class="empty-state">Error loading repositories. Try refreshing.</p>';
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
        try {
            // Debug logging
            console.log("showDeleteConfirmation called");
            console.log("Selected repos:", selectedRepos);
            
            if (selectedRepos.size === 0) {
                showStatus('No repositories selected', 'error');
                return;
            }

            reposToDeleteList.innerHTML = '';
            deleteQueue = Array.from(selectedRepos);
            
            console.log("Delete queue:", deleteQueue);
            
            deleteQueue.forEach(repoName => {
                const listItem = document.createElement('li');
                listItem.textContent = repoName;
                reposToDeleteList.appendChild(listItem);
            });

            // Make sure the modal is properly displayed
            confirmationModal.style.display = 'flex';
            console.log("Modal should be displayed now");
            
            // Debug and show any styling issues
            console.log("Modal current style:", confirmationModal.style.display);
            
            // Make sure modal is properly styled and visible
            document.body.classList.add('modal-open');
            
            showStatus("Please confirm deletion in the dialog", "success");
        } catch (error) {
            console.error("Error in showDeleteConfirmation:", error);
            showStatus(`Error showing delete confirmation: ${error.message}`, 'error');
        }
    }

    function hideDeleteConfirmation() {
        try {
            console.log("hideDeleteConfirmation called");
            confirmationModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        } catch (error) {
            console.error("Error in hideDeleteConfirmation:", error);
        }
    }

    async function deleteSelectedRepos() {
        try {
            console.log("deleteSelectedRepos called");
            hideDeleteConfirmation();
            
            if (deleteQueue.length === 0) {
                showStatus('No repositories selected for deletion', 'error');
                return;
            }

            showStatus(`Starting deletion of ${deleteQueue.length} repositories...`, 'success');
            
            let successCount = 0;
            let failCount = 0;
            let deletedRepos = []; // Track which repos were actually deleted

            for (const repoFullName of deleteQueue) {
                try {
                    showStatus(`Deleting ${repoFullName}...`, 'success');
                    console.log(`Attempting to delete: ${repoFullName}`);
                    
                    // Log the exact request being made
                    console.log(`DELETE request to: https://api.github.com/repos/${repoFullName}`);
                    console.log(`With token: ${token.substring(0, 4)}...${token.substring(token.length - 4)}`);
                    
                    const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    console.log(`Delete response status: ${response.status}`);
                    
                    if (response.status === 204) {
                        successCount++;
                        deletedRepos.push(repoFullName);
                        showStatus(`Successfully deleted ${repoFullName}`, 'success');
                    } else {
                        let errorMessage = `Failed with status ${response.status}`;
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.message || errorMessage;
                        } catch (e) {
                            // If we can't parse JSON response, just use the status code message
                        }
                        throw new Error(errorMessage);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`Error deleting ${repoFullName}:`, error);
                    showStatus(`Error deleting ${repoFullName}: ${error.message}`, 'error');
                }
                
                // Small delay between deletion requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Final status report
            const statusMessage = `Deletion completed: ${successCount} succeeded, ${failCount} failed`;
            showStatus(statusMessage, successCount > 0 ? 'success' : 'error');
            console.log(statusMessage);
            console.log("Deleted repos:", deletedRepos);
            
            // Ensure repositories array is updated by removing deleted repos
            if (successCount > 0) {
                const deletedRepoSet = new Set(deletedRepos);
                repositories = repositories.filter(repo => !deletedRepoSet.has(repo.full_name));
                selectedRepos.clear(); // Clear selections
                
                // Force refresh the repository list completely
                console.log("Refreshing repository list after deletion");
                await fetchRepositories();
            }
        } catch (error) {
            console.error("Error in deleteSelectedRepos:", error);
            showStatus(`Error in delete process: ${error.message}`, 'error');
        }
    }

    // Helper Functions
    function showStatus(message, type) {
        console.log(`Status: ${type} - ${message}`);
        statusMessage.textContent = message;
        statusMessage.className = 'status-message';
        statusMessage.classList.add(type);
        statusMessage.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
    }
});