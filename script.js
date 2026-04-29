document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let state = {
        os: null,
        gender: null,
        callTimerInterval: null,
        vibrationInterval: null,
        seconds: 0
    };

    // --- DOM Elements ---
    const screens = {
        selection: document.getElementById('screen-selection'),
        incomingCall: document.getElementById('screen-incoming-call'),
        inCall: document.getElementById('screen-in-call'),
        info: document.getElementById('screen-info')
    };

    const callUIContainer = document.getElementById('call-ui-container');
    const startBtn = document.getElementById('btn-start');
    const callTimer = document.getElementById('call-timer');

    // --- Screen Transitions ---
    function showScreen(screenId) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenId].classList.add('active');
    }

    // --- Selection Logic ---
    const osButtons = document.querySelectorAll('#os-selection button');
    const genderButtons = document.querySelectorAll('#gender-selection button');

    function checkStartCondition() {
        if (state.os && state.gender) {
            startBtn.disabled = false;
        }
    }

    osButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            osButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.os = btn.dataset.value;
            checkStartCondition();
        });
    });

    genderButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            genderButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.gender = btn.dataset.value;
            checkStartCondition();
        });
    });

    // --- Vibration Handler ---
    function startVibration() {
        if ('vibrate' in navigator) {
            // Vibrate pattern: 1000ms on, 500ms off
            state.vibrationInterval = setInterval(() => {
                navigator.vibrate([1000, 500]);
            }, 1500);
        }
    }

    function stopVibration() {
        if (state.vibrationInterval) {
            clearInterval(state.vibrationInterval);
            navigator.vibrate(0);
        }
    }

    // --- Call Logic ---
    startBtn.addEventListener('click', () => {
        setupIncomingCallUI();
        showScreen('incomingCall');
        startVibration();
    });

    function setupIncomingCallUI() {
        const callerName = state.gender === 'female' ? "내 사랑 ❤️" : "지연이";
        
        if (state.os === 'ios') {
            callUIContainer.innerHTML = `
                <div class="ios-call fade-in">
                    <div class="caller-id">
                        <div class="caller-name">${callerName}</div>
                        <div class="call-status">대한민국</div>
                    </div>
                    <div class="actions">
                        <div style="text-align:center">
                            <button class="ios-btn decline" id="btn-ios-decline">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 9c-1.6 0-3.15.25-4.6.74-.5.15-.9.26-1.4.26-.5 0-1-.21-1.41-.62l-1.9-1.9c-.44-.44-.7-1.05-.7-1.71 0-.67.26-1.28.7-1.72C5.1 1.65 8.42.5 12 .5s6.9 1.15 9.3 3.55c0.44 0.44 0.7 1.05 0.7 1.72 0 0.66-.25 1.28-.7 1.72l-1.89 1.89c-.41 0.41-.91 0.62-1.41 0.62-.5 0-.95-.11-1.4-.26-1.45-.49-3-.74-4.6-.74z"/>
                                </svg>
                            </button>
                            <p style="margin-top:10px; font-size:0.8rem">거절</p>
                        </div>
                        <div style="text-align:center">
                            <button class="ios-btn accept" id="btn-ios-accept">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                    <path d="M6.62,10.79c1.44,2.83,3.76,5.14,6.59,6.59l2.2-2.2c0.27-0.27,0.67-0.36,1.02-0.24c1.12,0.37,2.33,0.57,3.57,0.57 c0.55,0,1,0.45,1,1V20c0,0.55-0.45,1-1,1C10.75,21,3,13.25,3,4c0-0.55,0.45-1,1-1h3.5c0.55,0,1,0.45,1,1c0,1.24,0.2,2.45,0.57,3.57 c0.11,0.35,0.03,0.75-0.25,1.02L6.62,10.79z"/>
                                </svg>
                            </button>
                            <p style="margin-top:10px; font-size:0.8rem">응답</p>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('btn-ios-accept').onclick = acceptCall;
            document.getElementById('btn-ios-decline').onclick = endCall;
        } else {
            // Android UI
            callUIContainer.innerHTML = `
                <div class="android-call fade-in">
                    <div class="caller-id">
                        <div class="caller-avatar" style="margin: 0 auto 30px">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                        <h2>${callerName}</h2>
                        <p>수신 중...</p>
                    </div>
                    <div class="swipe-area">
                        <button class="ios-btn decline" id="btn-and-decline" style="width:60px; height:60px">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.74-.5.15-.9.26-1.4.26-.5 0-1-.21-1.41-.62l-1.9-1.9c-.44-.44-.7-1.05-.7-1.71 0-.67.26-1.28.7-1.72C5.1 1.65 8.42.5 12 .5s6.9 1.15 9.3 3.55c0.44 0.44 0.7 1.05 0.7 1.72 0 0.66-.25 1.28-.7 1.72l-1.89 1.89c-.41 0.41-.91 0.62-1.41 0.62-.5 0-.95-.11-1.4-.26-1.45-.49-3-.74-4.6-.74z"/>
                             </svg>
                        </button>
                        <button class="ios-btn accept" id="btn-and-accept" style="width:60px; height:60px">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M6.62,10.79c1.44,2.83,3.76,5.14,6.59,6.59l2.2-2.2c0.27-0.27,0.67-0.36,1.02-0.24c1.12,0.37,2.33,0.57,3.57,0.57 c0.55,0,1,0.45,1,1V20c0,0.55-0.45,1-1,1C10.75,21,3,13.25,3,4c0-0.55,0.45-1,1-1h3.5c0.55,0,1,0.45,1,1c0,1.24,0.2,2.45,0.57,3.57 c0.11,0.35,0.03,0.75-0.25,1.02L6.62,10.79z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('btn-and-accept').onclick = acceptCall;
            document.getElementById('btn-and-decline').onclick = endCall;
        }
    }

    function acceptCall() {
        stopVibration();
        showScreen('inCall');
        
        // Set caller name in call screen
        document.getElementById('in-call-name').innerText = state.gender === 'female' ? "내 사랑 ❤️" : "지연이";

        // Start Call Timer
        state.seconds = 0;
        state.callTimerInterval = setInterval(() => {
            state.seconds++;
            const mins = Math.floor(state.seconds / 60).toString().padStart(2, '0');
            const secs = (state.seconds % 60).toString().padStart(2, '0');
            callTimer.innerText = `${mins}:${secs}`;
            
            // Auto end after 30 seconds (simulating record end)
            if (state.seconds >= 30) {
                endCall();
            }
        }, 1000);

        /* 
           TODO: 녹음 파일 재생 로직
           const audio = new Audio('path/to/recording_' + state.gender + '.mp3');
           audio.play();
           audio.onended = endCall;
        */
        console.log("Audio playing placeholder for gender:", state.gender);
    }

    function endCall() {
        stopVibration();
        if (state.callTimerInterval) clearInterval(state.callTimerInterval);
        showScreen('info');
    }

    // --- End Call Button ---
    document.getElementById('btn-end-call').onclick = endCall;

    // --- Instagram Link ---
    document.getElementById('btn-instagram').onclick = () => {
        // window.location.href = "https://instagram.com/your_supporters_id"; // 추후 추가
        alert("인권 서포터즈 인스타그램으로 이동합니다. (링크 주석 처리됨)");
    };
});
