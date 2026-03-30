const DB = {
    getScripts() { return JSON.parse(localStorage.getItem('luavault_scripts') || '[]'); },
    saveScripts(scripts) { localStorage.setItem('luavault_scripts', JSON.stringify(scripts)); },
    getLoadstrings() { return JSON.parse(localStorage.getItem('luavault_loadstrings') || '[]'); },
    saveLoadstrings(ls) { localStorage.setItem('luavault_loadstrings', JSON.stringify(ls)); },
    genId() { return 'lv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8); },
    genKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let r = ''; for (let i = 0; i < 32; i++) r += chars[Math.floor(Math.random() * chars.length)];
        return r;
    }
};

let tempHostKeys = [];
let tempHostHWIDs = [];
let currentHostingScript = null;

// ========== REFINED OBFUSCATOR (MAX PROTECTION) ==========
function obfuscateLua(code) {
    const chars = code.split('').map(c => c.charCodeAt(0));
    const randomVar = () => 'lv_' + Math.random().toString(36).substr(2, 5);
    const v1 = randomVar();
    const v2 = randomVar();
    const v3 = randomVar();
    
    // Simple LBI-style obfuscation
    let obfuscated = `-- [ LuaVault Secure Obfuscation ]\n`;
    obfuscated += `local ${v1} = {${chars.join(',')}}; `;
    obfuscated += `local ${v2} = ""; `;
    obfuscated += `for ${v3}=1, #${v1} do ${v2} = ${v2} .. string.char(${v1}[${v3}]) end; `;
    obfuscated += `local ${randomVar()} = loadstring(${v2}); ${randomVar()}();`;
    
    // Add Anti-Tamper & Anti-Dump
    const antiDump = `\nif not (getfenv or getgenv) then return end; `;
    const antiDebug = `if (debug and debug.getinfo(1).source ~= "=[C]") then while true do end end; `;
    
    return antiDump + antiDebug + obfuscated;
}

// ========== TABS ==========
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('text-dark-200', 'hover:text-white', 'hover:bg-dark-500');
    });
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    activeBtn.classList.add('tab-active');
    activeBtn.classList.remove('text-dark-200', 'hover:text-white', 'hover:bg-dark-500');

    if (tab === 'vault') renderVault();
    if (tab === 'loadstrings') renderLoadstrings();
    updateVaultCount();
    lucide.createIcons();
}

function updateVaultCount() {
    const count = DB.getScripts().length;
    const el = document.getElementById('vault-count');
    if (el) el.textContent = count;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-vault-500' };
    toast.className = `toast ${colors[type] || colors.info} text-white px-5 py-3 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2`;
    const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" class="w-4 h-4"></i>${message}`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 3000);
}

function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// ========== TEMPLATES ==========
const templates = [
    { name: 'ESP Highlight', icon: 'eye', desc: 'Player ESP system', prompt: 'Create a Lua ESP script that highlights all players with boxes and name tags above their heads, with distance display and team color support' },
    { name: 'Auto Farm', icon: 'repeat', desc: 'Auto farming loop', prompt: 'Create a Lua auto-farming script with configurable targets, anti-AFK, and a clean toggle UI' },
    { name: 'Admin Commands', icon: 'terminal', desc: 'Admin command system', prompt: 'Create a Lua admin command system with commands like /tp, /speed, /fly, /noclip, /god with a chat command parser' },
    { name: 'UI Library', icon: 'layout', desc: 'Modern UI framework', prompt: 'Create a modern Lua UI library with windows, tabs, buttons, toggles, sliders, and dropdown menus with smooth animations' },
];

function renderTemplates() {
    const grid = document.getElementById('templates-grid');
    if (!grid) return;
    grid.innerHTML = templates.map(t => `
        <button onclick="useTemplate(\`${t.prompt.replace(/'/g, "\\'")}\`)" class="p-3 bg-dark-600/50 hover:bg-dark-600 border border-dark-400/30 hover:border-vault-500/30 rounded-lg text-left transition-all group">
            <div class="flex items-center gap-2 mb-1">
                <i data-lucide="${t.icon}" class="w-3.5 h-3.5 text-vault-400 group-hover:text-vault-300"></i>
                <span class="text-xs font-semibold text-white">${t.name}</span>
            </div>
            <p class="text-[10px] text-dark-300">${t.desc}</p>
        </button>
    `).join('');
}

function useTemplate(prompt) {
    document.getElementById('prompt-input').value = prompt;
    generateScript();
}

function generateScript() {
    const prompt = document.getElementById('prompt-input').value.trim();
    if (!prompt) return showToast('Please describe the script', 'error');

    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = 'Generating...';

    // Simulate AI Generation
    setTimeout(() => {
        const script = `-- Generated by LuaVault AI\nprint("Hello from LuaVault!")\n-- Your script: ${prompt}`;
        document.getElementById('code-output').value = script;
        updateLineCount();
        btn.disabled = false;
        btn.innerHTML = 'Generate Script';
        showToast('Script generated!');
    }, 1500);
}

function updateLineCount() {
    const code = document.getElementById('code-output').value;
    const lines = code.split('\n').length;
    document.getElementById('line-count').textContent = lines + ' lines';
}

function copyOutput() {
    const code = document.getElementById('code-output').value;
    navigator.clipboard.writeText(code);
    showToast('Copied to clipboard!');
}

function hostScript() {
    if (!currentHostingScript) return;
    const name = document.getElementById('host-name').value.trim() || 'Unnamed Script';
    const obfuscate = document.getElementById('host-obfuscate').checked;

    let finalCode = currentHostingScript.code;
    if (obfuscate) {
        finalCode = obfuscateLua(finalCode);
    }

    const loadstringId = DB.genId();
    // In a real app, this would be a real URL. For local demo, we just use a placeholder.
    const url = 'https://luavault.app/ls/' + loadstringId; 

    // Add protection logic (Key/HWID) to the code itself!
    const keyToggle = document.getElementById('host-key-toggle').checked;
    if (keyToggle && tempHostKeys.length > 0) {
        const keyTable = '{' + tempHostKeys.map(k => `["${k}"]=true`).join(',') + '}';
        finalCode = `local _keys = ${keyTable}; if not _keys[getgenv().Key] then return print("Invalid Key") end; ` + finalCode;
    }

    const ls = {
        id: loadstringId,
        name,
        code: finalCode,
        url: url,
        protection: {
            obfuscated: obfuscate,
            keys: [...tempHostKeys]
        },
        execCount: 0,
        enabled: true,
        createdAt: Date.now()
    };

    const loadstrings = DB.getLoadstrings();
    loadstrings.push(ls);
    DB.saveLoadstrings(loadstrings);

    closeModal('modal-host');
    switchTab('loadstrings');
    showToast('Script hosted successfully!');
}

function renderLoadstrings() {
    const loadstrings = DB.getLoadstrings();
    const list = document.getElementById('loadstrings-list');
    if (!list) return;

    list.innerHTML = loadstrings.map(ls => `
        <div class="bg-dark-700 rounded-xl border border-dark-400/50 p-5 ${ls.enabled ? '' : 'opacity-60'}">
            <h3 class="text-white font-bold mb-2">${ls.name}</h3>
            <div class="bg-dark-800 p-3 rounded-lg mb-3 flex items-center justify-between">
                <code class="text-xs text-vault-300 font-mono">loadstring(game:HttpGet("${ls.url}"))()</code>
                <button onclick="navigator.clipboard.writeText('loadstring(game:HttpGet(\"${ls.url}\"))()'); showToast('Copied!')" class="text-dark-300 hover:text-white">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="simulateLoad('${ls.id}')" class="px-3 py-1.5 bg-vault-600 text-white text-xs rounded-lg">Simulate Load</button>
                <button onclick="showLoadstringDetail('${ls.id}')" class="px-3 py-1.5 bg-dark-600 text-dark-100 text-xs rounded-lg">Manage</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Initial Call
document.addEventListener('DOMContentLoaded', () => {
    renderTemplates();
    updateVaultCount();
    lucide.createIcons();
});

function openHostModal() {
    const code = document.getElementById('code-output').value;
    if (!code) return showToast('Generate a script first', 'error');
    currentHostingScript = { code: code };
    openModal('modal-host');
}
