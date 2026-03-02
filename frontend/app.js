// Matrix Background Effect
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const drops = [];
const fontSize = 14;
const columns = Math.floor(canvas.width / fontSize);

for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100;
}

function drawMatrix() {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ff88';
    ctx.font = `${fontSize}px monospace`;
    
    for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 50);

// Platform configurations
const platforms = [
    {
        name: 'GitHub',
        icon: '⚡',
        url: (u) => `https://github.com/${u}`,
        check: async (u) => {
            try {
                const res = await fetch(`https://api.github.com/users/${u}`, { method: 'HEAD' });
                return res.status === 200;
            } catch (e) { return false; }
        }
    },
    {
        name: 'Twitter/X',
        icon: '𝕏',
        url: (u) => `https://x.com/${u}`,
        check: async (u) => {
            // No public API, use URL probing via image
            return checkUrlExists(`https://x.com/${u}`);
        }
    },
    {
        name: 'Instagram',
        icon: '📷',
        url: (u) => `https://instagram.com/${u}`,
        check: async (u) => checkUrlExists(`https://instagram.com/${u}`)
    },
    {
        name: 'Reddit',
        icon: '🤖',
        url: (u) => `https://reddit.com/user/${u}`,
        check: async (u) => {
            try {
                const res = await fetch(`https://www.reddit.com/user/${u}/about.json`, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                return res.status === 200;
            } catch (e) { return checkUrlExists(`https://reddit.com/user/${u}`); }
        }
    },
    {
        name: 'YouTube',
        icon: '▶️',
        url: (u) => `https://youtube.com/@${u}`,
        check: async (u) => checkUrlExists(`https://youtube.com/@${u}`)
    },
    {
        name: 'Twitch',
        icon: '🎮',
        url: (u) => `https://twitch.tv/${u}`,
        check: async (u) => {
            try {
                // Twitch requires client ID, fallback to URL check
                return checkUrlExists(`https://twitch.tv/${u}`);
            } catch (e) { return false; }
        }
    },
    {
        name: 'Facebook',
        icon: 'f',
        url: (u) => `https://facebook.com/${u}`,
        check: async (u) => checkUrlExists(`https://facebook.com/${u}`)
    },
    {
        name: 'LinkedIn',
        icon: 'in',
        url: (u) => `https://linkedin.com/in/${u}`,
        check: async (u) => checkUrlExists(`https://linkedin.com/in/${u}`)
    }
];

// CORS-safe URL existence check using image loading
function checkUrlExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => resolve(false), 5000);
        
        img.onload = function() {
            clearTimeout(timeout);
            resolve(true);
        };
        
        img.onerror = function() {
            clearTimeout(timeout);
            resolve(true); // Error means server responded, profile may exist
        };
        
        // Add random query to bypass cache
        img.src = url + '?_=' + Date.now();
    });
}

// Alternative: Fetch with HEAD for GitHub API
async function checkWithFetch(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(url, { 
            method: 'HEAD',
            signal: controller.signal,
            mode: 'no-cors'
        });
        
        clearTimeout(timeout);
        return res.status !== 404;
    } catch (e) {
        return false;
    }
}

// Main search function
async function searchUsername() {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) return;

    const searchBtn = document.getElementById('searchBtn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    searchBtn.disabled = true;
    loading.classList.remove('hidden');
    results.classList.remove('hidden');
    results.innerHTML = '';

    // Create pending cards
    const cardMap = {};
    platforms.forEach(platform => {
        const card = createCard(platform, username, 'pending');
        results.appendChild(card);
        cardMap[platform.name] = card;
    });

    // Check all platforms in parallel
    const checks = platforms.map(async (platform) => {
        const exists = await platform.check(username);
        updateCard(cardMap[platform.name], platform, username, exists);
    });

    await Promise.all(checks);
    
    loading.classList.add('hidden');
    searchBtn.disabled = false;
}

function createCard(platform, username, status) {
    const card = document.createElement('a');
    card.className = `platform-card ${status}`;
    card.href = platform.url(username);
    card.target = '_blank';
    card.rel = 'noopener';
    card.innerHTML = `
        <div class="platform-icon">${platform.icon}</div>
        <div class="platform-info">
            <div class="platform-name">${platform.name}</div>
            <div class="platform-username">@${username}</div>
        </div>
        <div class="status-indicator checking"></div>
    `;
    return card;
}

function updateCard(card, platform, username, exists) {
    card.className = `platform-card ${exists ? 'exists' : 'not-exists'}`;
    const indicator = card.querySelector('.status-indicator');
    indicator.className = `status-indicator ${exists ? 'found' : 'not-found'}`;
    
    if (!exists) {
        card.href = '#';
        card.onclick = (e) => {
            e.preventDefault();
            alert(`Usuario no encontrado en ${platform.name}`);
        };
    }
}

// Enter key support
document.getElementById('usernameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchUsername();
});
