// --- State Management ---
let websocket = null;
let isConnected = false;
let isLeader = false;
let myUsername = "";
let partyMembers = [];

// --- Web Audio API Setup ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let alarmBuffer = null;

fetch('zbuff01.wav')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.arrayBuffer();
    })
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
        alarmBuffer = audioBuffer;
        logStatus("Audio file loaded successfully.");
        console.log("Audio buffer loaded:", alarmBuffer);
    })
    .catch(error => {
        logStatus(`Error loading audio file: ${error.message}`);
        console.error("Error loading audio file:", error);
    });

function playSound() {
    if (!alarmBuffer) {
        logStatus("Audio not ready to play.");
        console.warn("Attempted to play sound, but alarmBuffer is null.");
        return;
    }
    const source = audioContext.createBufferSource();
    source.buffer = alarmBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    console.log("Playing sound.");
}

// --- DOM Element References ---
const connectButton = document.getElementById('connectButton');
const sendEventButton = document.getElementById('sendEventButton');
const statusLog = document.getElementById('statusLog');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const inputs = {
    username: document.getElementById('username'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    party: document.getElementById('party'),
    password: document.getElementById('password')
};

// --- UI Update Logic ---
function updateUIState() {
    connectButton.textContent = isConnected ? "Disconnect" : "Connect";
    for (const key in inputs) {
        inputs[key].disabled = isConnected;
    }
    sendEventButton.disabled = !(isConnected && isLeader);
    console.log(`UI State Updated: isConnected=${isConnected}, isLeader=${isLeader}, sendButton.disabled=${sendEventButton.disabled}`); // Debugging
}

function logStatus(text) {
    const line = document.createElement('div');
    line.textContent = text;
    statusLog.appendChild(line);
    statusLog.scrollTop = statusLog.scrollHeight;
    console.log(`STATUS: ${text}`);
}

// --- WebSocket Logic ---
function connect() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        logStatus("Already connected or connecting.");
        return;
    }

    const host = inputs.host.value.trim();
    const port = inputs.port.value.trim();
    const party = inputs.party.value.trim();
    const password = inputs.password.value.trim();
    myUsername = inputs.username.value.trim();

    if (!host || !port || !party || !password || !myUsername) {
        logStatus("All fields are required.");
        return;
    }

    const uri = `wss://${host}:${port}`;
    
    logStatus(`Connecting to ${uri}...`);
    console.log(`Attempting WebSocket connection to ${uri}`);
    
    try {
        websocket = new WebSocket(uri);

        websocket.onopen = () => {
            isConnected = true;
            logStatus(`Connected successfully.`);
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
            logStatus(`Connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
            console.log("WebSocket closed event:", event);
            updateUIState();
        };

        websocket.onerror = (error) => {
            logStatus("WebSocket connection error. Check server address and port, or browser console for SSL errors.");
            console.error("WebSocket error:", error);
            isConnected = false;
            isLeader = false;
            partyMembers = [];
            updateUIState();
        };
    } catch (e) {
        logStatus(`Failed to create WebSocket: ${e.message}`);
        console.error("WebSocket creation error:", e);
    }
}

function disconnect() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        logStatus("Disconnecting...");
        websocket.close(1000, "Client initiated disconnect");
    } else {
        logStatus("Not connected to disconnect.");
    }
}

function handleServerMessage(msg) {
    console.log(`Received message: ${msg}`);
    const parts = msg.split(":", 2);
    const command = parts[0];
    const payload = parts.length > 1 ? parts[1] : "";

    switch (command) {
        case "JOIN_OK":
            logStatus("Successfully joined party!");
            break;
        case "PARTY_UPDATE":
            parsePartyUpdate(msg);
            break;
        case "COUNTDOWN":
            logStatus("Leader has started the countdown!");
            break;
        case "PLAY_SOUND":
            logStatus("Z-Buff now!");
            playSound();
            break;
        case "TIMER_ALREADY_ACTIVE":
            logStatus("Timer is already active!");
            break;
        case "NOT_LEADER":
            logStatus("You are not the party leader!");
            break;
        case "INVALID_COMMAND":
            logStatus("Invalid command. Use JOIN:party:pass:user");
            break;
        case "INVALID_JOIN_FORMAT":
            logStatus("Invalid JOIN format. Use JOIN:party:pass:user");
            break;
        case "INVALID_PARTY_NAMING":
            logStatus("Invalid PARTY name.");
            break;
        case "INCORRECT_PASSWORD":
            logStatus("Incorrect password.");
            break;
        default:
            logStatus(`Server: ${msg}`);
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
        logStatus("Party is now empty.");
    } else {
        const formattedMembers = membersString.map((m, i) => i === 0 ? `${m} (Leader)` : m).join(', ');
        logStatus(`[${activePartyName}](${membersString.length}): ${formattedMembers}`);
    }
    updateUIState();
    console.log(`Party Update Processed: isLeader=${isLeader}, Members:`, membersString);
}

function populateFromLocalStorage(){
    const savedUsername = localStorage.getItem('myUsername');
    const savedHost = localStorage.getItem('host');
    const savedPort = localStorage.getItem('port');
    const savedParty = localStorage.getItem('party');

    if (savedUsername) inputs.username.value = savedUsername;
    if (savedHost) inputs.host.value = savedHost;
    if (savedPort) inputs.port.value = savedPort;
    if (savedParty) inputs.party.value = savedParty;
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
    localStorage.setItem('myUsername', inputs.username.value.trim())
    localStorage.setItem('host', inputs.host.value.trim());
    localStorage.setItem('port', inputs.port.value.trim());
    localStorage.setItem('party', inputs.party.value.trim());
});

sendEventButton.addEventListener('click', () => {
    if (isConnected && isLeader) {
        websocket.send("START");
        logStatus(`[${inputs.party.value.trim()}] (Leader): START initiated.`);
        console.log("Send START via button.");
    } else if (isConnected && !isLeader) {
        logStatus("You must be the party leader to start the timer.");
        console.warn("Attempted to send START but not leader.");
    } else {
        logStatus("Not connected to a party.");
        console.warn("Attempted to send START but not connected.");
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'PageDown') {
        event.preventDefault();
        if (isConnected && isLeader) {
            websocket.send("START");
            logStatus(`[${inputs.party.value.trim()}] (Leader): START initiated via hotkey.`);
            console.log("Send START via hotkey.");
        } else if (isConnected && !isLeader) {
            logStatus("You must be the party leader to start the timer.");
            console.warn("Attempted to send START via hotkey but not leader.");
        } else {
            logStatus("Not connected to a party.");
            console.warn("Attempted to send START via hotkey but not connected.");
        }
    }
});

// --- Theme Toggling Logic ---
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        themeToggle.checked = true;
    } else {
        body.classList.remove('dark-theme');
        themeToggle.checked = false;
    }
}

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
});

// --- Initial Page Setup ---
document.addEventListener('DOMContentLoaded', () => {
    populateFromLocalStorage();
    applySavedTheme();
    updateUIState();
});