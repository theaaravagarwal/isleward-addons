// ==UserScript==
// @name        RGB Pathing
// @namespace   Isleward.Addon
// @match       https://play.isleward.com/*
// @match       https://ptr.isleward.com/*
// @grant       none
// @version     1.0.0
// @author      Siege
// @description Walk on a rainbow.
// ==/UserScript==

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
            events.on('onGetPlayer', this.onGetPlayer.bind(this));
        },
        onGetPlayer: function(player) {
            this.main(player);
        },
        main: function(player) {
            let startTime = Date.now();
            let frequency = 0.001; // freq of the wave
            let amplitude = 128; // amplitude of wave (max of 255)
            let delay = 7.5; // lower values => faster shifting and vice versa
            setInterval(() => {
                let elapsedTime = Date.now() - startTime;
                let r = Math.floor(amplitude*(Math.sin(frequency*elapsedTime+0)+1));
                let g = Math.floor(amplitude*(Math.sin(frequency*elapsedTime+2)+1));
                let b = Math.floor(amplitude*(Math.sin(frequency*elapsedTime+4)+1));
                player.pather.pathColor = `0x${(r<<16|g<<8|b).toString(16).padStart(6, '0')}`;
                player.pather.pathAlpha = 0.5;
            }, delay);
        }
    });
});
