// --- State Management ---
let websocket = null;
let isConnected = false;
let isLeader = false;
let myUsername = "";
let partyMembers = [];

// --- DOM Element References ---
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;
const statusLog = document.getElementById('statusLog');

// Mode Switcher
const partyModeRadio = document.getElementById('partyMode');
const soloModeRadio = document.getElementById('soloMode');
const partyControls = document.getElementById('party-controls');
const soloControls = document.getElementById('solo-controls');

// Party Controls
const connectButton = document.getElementById('connectButton');
const sendEventButton = document.getElementById('sendEventButton');
const partyInputs = {
    username: document.getElementById('username'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    party: document.getElementById('party'),
    password: document.getElementById('password')
};

// --- UI Update Logic ---
function updateUIState() {
    connectButton.textContent = isConnected ? "Disconnect" : "Connect";
    for (const key in partyInputs) {
        partyInputs[key].disabled = isConnected;
    }
    sendEventButton.disabled = !(isConnected && isLeader);
    console.log(`UI State Updated: isConnected=${isConnected}, isLeader=${isLeader}, sendButton.disabled=${sendEventButton.disabled}`); // Debugging
}

// --- Mode Switching Logic ---
function handleModeChange() {
    if (partyModeRadio.checked) {
        partyControls.style.display = 'block';
        soloControls.style.display = 'none';
        logStatus("[INFO] Switched to Party Sync mode.");
    } else {
        partyControls.style.display = 'none';
        soloControls.style.display = 'block';
        logStatus("[INFO] Switched to Solo Timers mode.");
    }
}

document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
});

function logStatus(text) {
    const line = document.createElement('div');
    line.textContent = text;
    statusLog.appendChild(line);
    statusLog.scrollTop = statusLog.scrollHeight;
    console.log(`${text}`);
}

// --- WebSocket Logic ---
function connect() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        logStatus("[INFO] Already connected or connecting.");
        return;
    }

    const host = partyInputs.host.value.trim();
    const port = partyInputs.port.value.trim();
    const party = partyInputs.party.value.trim();
    const password = partyInputs.password.value.trim();
    myUsername = partyInputs.username.value.trim();

    if (!host || !party || !password || !myUsername) {
        logStatus("[ERROR] All fields are required.");
        return;
    }

    const uri = `wss://${host}:${port}`;
    
    logStatus(`[INFO] Connecting to ${uri}...`);
    console.log(`Attempting WebSocket connection to ${uri}`);
    
    try {
        websocket = new WebSocket(uri);

        websocket.onopen = () => {
            isConnected = true;
            logStatus(`[INFO] Connected successfully.`);
            const joinMessage = `JOIN:${party}:${password}:${myUsername}`;
            websocket.send(joinMessage);
            console.log(`Sent: ${joinMessage}`);
            updateUIState();
        };

        websocket.onmessage = (event) => {
            handleServerMessage(event.data);
        };

        websocket.onclose = (event) => {
            isConnected = false;
            isLeader = false;
            partyMembers = [];
            logStatus(`[INFO] Connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
            console.log("WebSocket closed event:", event);
            updateUIState();
        };

        websocket.onerror = (error) => {
            logStatus("[INFO] WebSocket connection error. Check server address and port, or browser console for SSL errors.");
            console.error("WebSocket error:", error);
            isConnected = false;
            isLeader = false;
            partyMembers = [];
            updateUIState();
        };
    } catch (e) {
        logStatus(`[ERROR] Failed to create WebSocket: ${e.message}`);
        console.error("WebSocket creation error:", e);
    }
}

function disconnect() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        logStatus("[INFO] Disconnecting...");
        websocket.close(1000, "Client initiated disconnect");
    } else {
        logStatus("[INFO] Not connected to disconnect.");
    }
}

function handleServerMessage(msg) {
    console.log(`Received message: ${msg}`);
    const parts = msg.split(":", 2);
    const command = parts[0];
    const payload = parts.length > 1 ? parts[1] : "";

    switch (command) {
        case "JOIN_OK":
            logStatus("[INFO] Successfully joined party!");
            break;
        case "PARTY_UPDATE":
            parsePartyUpdate(msg);
            break;
        case "COUNTDOWN":
            logStatus("[INFO] Leader has started the countdown!");
            break;
        case "PLAY_SOUND":
            logStatus("[INFO] Z-Buff now!");
            playSound();
            break;
        case "TIMER_ALREADY_ACTIVE":
            logStatus("[INFO] Timer is already active!");
            break;
        case "NOT_LEADER":
            logStatus("[ERROR] You are not the party leader!");
            break;
        case "INVALID_COMMAND":
            logStatus("[ERROR] Invalid command. Use JOIN:party:pass:user");
            break;
        case "INVALID_JOIN_FORMAT":
            logStatus("[ERROR] Invalid JOIN format. Use JOIN:party:pass:user");
            break;
        case "INVALID_PARTY_NAMING":
            logStatus("[ERROR] Invalid PARTY name.");
            break;
        case "INCORRECT_PASSWORD":
            logStatus("[ERROR] Incorrect password.");
            break;
        default:
            logStatus(`[INFO] Server: ${msg}`);
            console.warn(`Unhandled server command: ${command}, Payload: ${payload}`);
    }
}

function parsePartyUpdate(payload) {
    const payloadParts = payload.split(':');
    const activePartyName = payloadParts[1];
    const membersString = payloadParts.slice(2);

    isLeader = membersString.length > 0 && membersString[0] === myUsername;
    console.log(membersString)
    if (membersString.length === 0) {
        logStatus(`[${activePartyName}]: Party is now empty.`);
    } else {
        const formattedMembers = membersString.map((m, i) => i === 0 ? `${m} (Leader)` : m).join(', ');
        logStatus(`[${activePartyName}](${membersString.length}): ${formattedMembers}`);
    }
    updateUIState();
    console.log(`[${activePartyName}]: Party Update: isLeader=${isLeader}, Members:`, membersString);
}

function populateFromLocalStorage(){
    const savedUsername = localStorage.getItem('myUsername');
    const savedHost = localStorage.getItem('host');
    const savedPort = localStorage.getItem('port');
    const savedParty = localStorage.getItem('party');

    if (savedUsername) partyInputs.username.value = savedUsername;
    if (savedHost) partyInputs.host.value = savedHost;
    if (savedPort) partyInputs.port.value = savedPort;
    if (savedParty) partyInputs.party.value = savedParty;
}

// --- Event Listeners ---
connectButton.addEventListener('click', () => {
    if (isConnected) {
        disconnect();
    } else {
        connect();
    }
});
connectButton.addEventListener('click', () => {
    localStorage.setItem('myUsername', partyInputs.username.value.trim())
    localStorage.setItem('host', partyInputs.host.value.trim());
    localStorage.setItem('port', partyInputs.port.value.trim());
    localStorage.setItem('party', partyInputs.party.value.trim());
});

sendEventButton.addEventListener('click', () => {
    if (isConnected && isLeader) {
        websocket.send("START");
        logStatus(`[${partyInputs.party.value.trim()}]: START initiated.`);
        console.log("Send START via button.");
    } else if (isConnected && !isLeader) {
        logStatus(`[${partyInputs.party.value()}]: You must be the party leader to start the timer.`);
        console.warn("Attempted to send START but not leader.");
    } else {
        logStatus(`[${partyInputs.party.value()}]: Not connected to a party.`);
        console.warn("Attempted to send START but not connected.");
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'PageDown') {
        event.preventDefault();
        if (isConnected && isLeader) {
            websocket.send("START");
            logStatus(`[${partyInputs.party.value.trim()}]: START initiated via hotkey.`);
            console.log("Sent START via hotkey.");
        } else if (isConnected && !isLeader) {
        logStatus(`[${partyInputs.party.value()}]: You must be the party leader to start the timer.`);
        console.warn("Attempted to send START but not leader.");
        } else {
            logStatus(`[${partyInputs.party.value()}]: Not connected to a party.`);
            console.warn("Attempted to send START but not connected.");
        }
    }
});

// --- Theme Toggling Logic ---
function applySavedTheme() {
    const savedTheme = localStorage.getItem('olun_theme');
    if (savedTheme === 'light') {
        htmlElement.setAttribute('data-theme', 'light');
        themeToggle.checked = true;
    } else {
        htmlElement.removeAttribute('data-theme');
        themeToggle.checked = false;
    }
}

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        htmlElement.setAttribute('data-theme', 'light');
        localStorage.setItem('olun_theme', 'light');
    } else {
        htmlElement.removeAttribute('data-theme');
        localStorage.setItem('olun_theme', 'dark');
    }
});
// --- Initial Page Setup ---
document.addEventListener('DOMContentLoaded', () => {
    populateFromLocalStorage();
    applySavedTheme();
    updateUIState();
});