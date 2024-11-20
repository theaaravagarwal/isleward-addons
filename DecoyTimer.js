// ==UserScript==
// @name        Decoy Timer
// @namespace   Isleward.Addon
// @match       https://play.isleward.com/*
// @match       https://ptr.isleward.com/*
// @grant       none
// @version     1.0
// @author      Siege
// @description Decoy Timer Queue
// ==/UserScript==

let ticksPerSecond = 17/7; // ticks per second
let ticks;
let decoyTimers = {};
let timerUpdateInterval;

function defer(method) {
    if (window.jQuery) {
        method();
    } else {
        setTimeout(() => defer(method), 50);
    }
}

defer(() => {
    addons.register({
        init: function(events) {
            events.on('onGetItems', this.onGetItems.bind(this));
            events.on('onGetObject', this.onGetObject.bind(this));
            this.createQueueDisplay();
        },
        onGetItems: function(inv) {
            if (!inv) return;
            for (let item in inv) {
                if (inv[item].name === "Nyxaliss' Nock") {
                    ticks = inv[item].effects[0].rolls.castSpell.duration;
                }
            }
        },
        onGetObject: function(obj) {
            if (!obj) return;
            if (obj.name === "Decoy") {
                this.startDecoyTimer(obj);
            }
        },
        startDecoyTimer: function(decoyObj) {
            let seconds = ticks / ticksPerSecond || 0;
            let decoyEndTime = Date.now() + (seconds * 1000);
            let decoyId = decoyObj.id || `decoy-${Date.now() + Math.random()}`;
            if (!decoyTimers[decoyId]) {
                decoyTimers[decoyId] = {
                    name: `Decoy (${decoyId})`,
                    endTime: decoyEndTime,
                    seconds
                };
            }
            this.updateQueueDisplay();
            if (!timerUpdateInterval) {
                timerUpdateInterval = setInterval(() => this.updateTimers(), 50);
            }
        },
        updateTimers: function() {
            let currentTime = Date.now();
            for (let [decoyId, timer] of Object.entries(decoyTimers)) {
                if (timer.endTime <= currentTime) {
                    delete decoyTimers[decoyId];
                }
            }
            this.updateQueueDisplay();
            if (Object.keys(decoyTimers).length === 0) {
                clearInterval(timerUpdateInterval);
                timerUpdateInterval = null;
            }
        },
        createQueueDisplay: function() {
            this.queueContainer = document.createElement('div');
            this.queueContainer.id = 'decoy-timer-queue';
            let savedPosition = JSON.parse(localStorage.getItem('decoyTimerPosition'));
            Object.assign(this.queueContainer.style, {
                position: 'fixed',
                top: savedPosition?.top || '15px',
                left: savedPosition?.left || '15px',
                minWidth: '150px',
                backgroundColor: 'rgb(58, 59, 74)',
                color: 'rgb(141, 167, 167)',
                fontSize: '15px',
                border: '2px solid #404040',
                zIndex: '10000',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                cursor: 'move',
            });
            const header = document.createElement('div');
            header.innerHTML = "<strong>Decoy Timer</strong>";
            Object.assign(header.style, {
                backgroundColor: '#2c2f3a',
                color: 'rgb(180, 180, 180)',
                fontSize: '16px',
                fontWeight: 'bold',
                textAlign: 'center',
                borderBottom: '1px solid #404040',
                padding: '5px 0',
            });
            this.queueContainer.appendChild(header);
            this.contentArea = document.createElement('div');
            this.contentArea.style.padding = '10px';
            this.queueContainer.appendChild(this.contentArea);
            document.body.appendChild(this.queueContainer);
            this.makeDraggable(this.queueContainer);
        },

        makeDraggable: function(element) {
            let isDragging = false;
            let offsetX = 0, offsetY = 0;
            const onMouseDown = (e) => {
                isDragging = true;
                offsetX = e.clientX - element.getBoundingClientRect().left;
                offsetY = e.clientY - element.getBoundingClientRect().top;
                element.style.cursor = 'grabbing';

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            const onMouseMove = (e) => {
                if (isDragging) {
                    let left = e.clientX - offsetX;
                    let top = e.clientY - offsetY;
                    element.style.left = `${left}px`;
                    element.style.top = `${top}px`;
                    localStorage.setItem(
                        'decoyTimerPosition',
                        JSON.stringify({ top: `${top}px`, left: `${left}px` })
                    );
                }
            };
            const onMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    element.style.cursor = 'move';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
            };

            element.addEventListener('mousedown', onMouseDown);
        },
        updateQueueDisplay: function() {
            this.contentArea.innerHTML = "";
            Object.entries(decoyTimers).forEach(([decoyId, timer]) => {
                let remainingTime = Math.max(0, timer.endTime - Date.now());
                let remainingSeconds = remainingTime / 1000;
                let timerElement = document.createElement("div");
                timerElement.innerText = `${timer.name}: ${this.formatTime(remainingSeconds)}`;
                timerElement.style.marginBottom = '5px';
                this.contentArea.appendChild(timerElement);
            });
        },
        formatTime: function(seconds) {
            let wholeSeconds = Math.floor(seconds);
            let milliseconds = Math.floor((seconds - wholeSeconds) * 1000);
            return `${wholeSeconds}:${milliseconds.toString().padStart(3, '0')}`;
        }
    });
});
