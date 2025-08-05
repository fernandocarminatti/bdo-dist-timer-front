// --- Web Audio API Setup ---
const startSoloTimer = document.getElementById('timerButton');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let firstHeartSoundBuffer = null;
let secondHeartSoundBuffer = null;
let thirdHeartSoundBuffer = null;
let longTimerSoundBuffer = null;
let sequenceIntervalId = null;

const soloTimerInputs = {
    zbuff: document.getElementById('zbuff-timer'),
    firstHeart: document.getElementById('firstHeartDisplay'),
    secondHeart: document.getElementById('secondHeartDisplay'),
    thirdHeart: document.getElementById('thirdHeartDisplay'),
    timerDisplay: document.querySelectorAll('.timer-display')
}

Promise.all([
    fetch('assets/firstHeart.wav').then(res => res.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)),
    fetch('assets/secondHeart.wav').then(res => res.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)),
    fetch('assets/thirdHeart.wav').then(res => res.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)),
    fetch('assets/zbuff01.wav').then(res => res.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)),
]).then(([firstHeartBuffer, secondHeartBuffer, thirdHeartBuffer, longTimerBuffer]) => {
    firstHeartSoundBuffer = firstHeartBuffer;
    secondHeartSoundBuffer = secondHeartBuffer;
    thirdHeartSoundBuffer = thirdHeartBuffer;
    longTimerSoundBuffer = longTimerBuffer;
    logStatus("[INFO] Audio file loaded successfully.");
}).catch(error => {
    logStatus(`[ERROR] Error loading audio file: ${error.message}`);
    console.error("Error loading audio file:", error);
});

function playSound(bufferToPlay) {
    if (!bufferToPlay) {
        logStatus("[WARN] Audio buffer not ready to play.");
        return;
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.connect(audioContext.destination);
    source.start(0);
}

function runTimerSequence(){
    if (sequenceIntervalId) {
        clearInterval(sequenceIntervalId);
        sequenceIntervalId = null;
        logStatus("[INFO] Sequence stopped by user.");
        startSoloTimer.textContent = 'Start Timer';
        return;
    }

    const firstHeartTimer = parseInt(soloTimerInputs.firstHeart.value, 10);
    const secondHeartTimer = parseInt(soloTimerInputs.secondHeart.value, 10);
    const thirdHeartTimer = parseInt(soloTimerInputs.thirdHeart.value, 10);
    const zbufftimer = parseInt(soloTimerInputs.zbuff.value, 10);

    const triggerFirstHeart = firstHeartTimer;
    const triggerSecondHeart = triggerFirstHeart + secondHeartTimer;
    const triggerZBuff = zbufftimer;
    const triggerThirdHeart = triggerSecondHeart + thirdHeartTimer;
    
    const triggerEvents = {
        [triggerFirstHeart]: { name: 'First Heart', soundBuffer: firstHeartSoundBuffer },
        [triggerSecondHeart]: { name: 'Second Heart', soundBuffer: secondHeartSoundBuffer },
        [triggerZBuff]:   { name: 'Long Timer (275s)', soundBuffer: longTimerSoundBuffer },
        [triggerThirdHeart]: { name: 'Third Heart', soundBuffer: thirdHeartSoundBuffer },
    };

    const totalDuration = Math.max(...Object.keys(triggerEvents).map(Number));
    let elapsedSeconds = 0;
    logStatus(`[INFO] Starting timer sequence - ${totalDuration}s`);
    Object.keys(triggerEvents).forEach(time => {
        console.log(`[EVENT] '${triggerEvents[time].name}' scheduled at ${time}s.`);
    });
    startSoloTimer.textContent = 'Stop Sequence';

    sequenceIntervalId = setInterval(() => {
        elapsedSeconds++;
        const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
        soloTimerInputs.timerDisplay.textContent = `00:${seconds}`;
        if (triggerEvents[elapsedSeconds]) {
            const event = triggerEvents[elapsedSeconds];
            logStatus(`[EVENT] ${event.name} triggered! ${elapsedSeconds}s`);
            playSound(event.soundBuffer);
        }

        if (elapsedSeconds >= totalDuration) {
            clearInterval(sequenceIntervalId);
            sequenceIntervalId = null;
            logStatus("[INFO] Sequence complete.");
            startSoloTimer.textContent = 'Start Timer';
        }
    }, 1000);
}

startSoloTimer.addEventListener('click', runTimerSequence);
startSoloTimer.addEventListener('click', () => {
    localStorage.setItem('olun_zBuffTimer', soloTimerInputs.zbuff.value.trim())
    localStorage.setItem('olun_firstHeartTimer', soloTimerInputs.firstHeart.value.trim());
    localStorage.setItem('olun_secondHeartTimer', soloTimerInputs.secondHeart.value.trim());
    localStorage.setItem('olun_thirdHeartTimer', soloTimerInputs.thirdHeart.value.trim());
});
function populateSoloTimersFromLocalStorage(){
    const zBuffSavedInput = localStorage.getItem('olun_zBuffTimer');
    const firstHeartSavedInput = localStorage.getItem('olun_firstHeartTimer');
    const secondHeartSavedInput = localStorage.getItem('olun_secondHeartTimer');
    const thirdHeartSavedInput = localStorage.getItem('olun_thirdHeartTimer');

    if (zBuffSavedInput) soloTimerInputs.zbuff.value = zBuffSavedInput;
    if (firstHeartSavedInput) soloTimerInputs.firstHeart.value = firstHeartSavedInput;
    if (secondHeartSavedInput) soloTimerInputs.secondHeart.value = secondHeartSavedInput;
    if (thirdHeartSavedInput) soloTimerInputs.thirdHeart.value = thirdHeartSavedInput;
}
document.addEventListener('DOMContentLoaded', () => {
    populateSoloTimersFromLocalStorage();
});