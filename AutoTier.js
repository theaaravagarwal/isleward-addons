// ==UserScript==
// @name        AutoTier
// @namespace   Isleward.Addon
// @match       https://play.isleward.com/*
// @match       https://ptr.isleward.com/*
// @version     1.11
// @author      Siege
// @description Does the math for you :) Now with customizability!
// @grant       none
// ==/UserScript==

//Preference Config
const DECIMAL_PLACES = 2;
const HIDING = false;

//Header Config
const HEADER_RGB = true;
const HEADER_RGB_DELAY = 50;
const HEADER_TEXT_SIZE = '18px';

//Tierbox Config
const TIERBOX_RGB = false;
const TIERBOX_RGB_DELAY = 50;
const TIERBOX_TEXT_SIZE = '16px';
const TIER_BOX_MIN_WIDTH = '150px';
const TIER_BOX_MAX_WIDTH = '300px';
const TIER_BOX_TOP = localStorage.getItem('tierBoxTop') || '20px';
const TIER_BOX_LEFT = localStorage.getItem('tierBoxLeft') || '20px';

//Stat Config
const STAT_CONFIG = {
    str: { weight: 1, types: ['bear'], maxStat: 10 },
    dex: { weight: 1, types: ['lynx'], maxStat: 10 },
    int: { weight: 1, types: ['owl'], maxStat: 10 },
    allAttributes: { weight: 1, types: ['bear', 'owl', 'lynx'], maxStat: 10 },
    addCritChance: { weight: 1, types: ['bear', 'owl', 'lynx'], maxStat: 78 },
    addAttackCritChance: { weight: 1, types: ['bear', 'lynx'], maxStat: 78 },
    addSpellCritChance: { weight: 1, types: ['owl'], maxStat: 78 },
    addCritMultiplier: { weight: 1, types: ['bear', 'owl', 'lynx'], maxStat: 28 },
    addAttackCritMultiplier: { weight: 1, types: ['bear', 'lynx'], maxStat: 28 },
    addSpellCritMultiplier: { weight: 1, types: ['owl'], maxStat: 28 },
    elementPoisonPercent: { weight: 1/2, types: ['lynx'], maxStat: 3 },
    physicalPercent: { weight: 1/2, types: ['lynx', 'bear'], maxStat: 3 },
    vit: { weight: 1/2, types: ['lynx', 'bear', 'owl'], maxStat: 7 },
    regenMana: { weight: 1/2, types: ['lynx'], maxStat: 5 },
    itemQuantity: { weight: 1/2, types: ['lynx', 'owl', 'bear'], maxStat: 27 },
    magicFind: { weight: 1/2, types: ['lynx', 'owl', 'bear'], maxStat: 15 }
};

function calculateTier(stats) {
    let tiers = { bear: 0, lynx: 0, owl: 0 };

    for (let stat in STAT_CONFIG) {
        let statValue = stats[stat] || 0;
        let { weight, maxStat, types } = STAT_CONFIG[stat];

        for (let type of types) {
            if ((type === 'owl' && (stat === 'addAttackCritMultiplier' || stat === 'addAttackCritChance')) || (type === 'lynx' && (stat === 'addSpellCritMultiplier' || stat === 'addSpellCritChance'))) continue;
            tiers[type] += (statValue / maxStat) * weight;
        }
    }
    let maxTierType = Object.keys(tiers).reduce((max, type) => tiers[type] > tiers[max] ? type : max, 'bear');
    let maxValue = tiers[maxTierType];
    return {
        maxTier: maxTierType,
        maxValue: maxValue.toFixed(DECIMAL_PLACES),
        calculatedStats: stats
    };
}


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
            events.on('onShowItemTooltip', this.onShowItemTooltip.bind(this));
            events.on('onHideItemTooltip', this.onHideItemTooltip.bind(this));
            this.createDraggableTierBox();
            if (HEADER_RGB) this.startRGBAnimation(this.tierBox.querySelector('strong'), HEADER_RGB_DELAY);
            if (TIERBOX_RGB) this.startRGBAnimation(this.contentArea, TIERBOX_RGB_DELAY);
        },
        createDraggableTierBox: function() {
            this.tierBox = document.createElement('div');
            this.tierBox.className = 'tierBox';
            document.body.appendChild(this.tierBox);
            Object.assign(this.tierBox.style, {
                position: 'fixed',
                top: TIER_BOX_TOP,
                left: TIER_BOX_LEFT,
                minWidth: TIER_BOX_MIN_WIDTH,
                maxWidth: TIER_BOX_MAX_WIDTH,
                height: 'auto',
                backgroundColor: 'rgb(58, 59, 74)',
                color: 'rgb(141, 167, 167)',
                fontSize: TIERBOX_TEXT_SIZE,
                border: '2px solid #404040',
                zIndex: '1000',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
            });
            const header = document.createElement('div');
            header.innerHTML = "<strong>AutoTier</strong>";
            Object.assign(header.style, {
                backgroundColor: '#2c2f3a',
                color: 'rgb(180, 180, 180)',
                cursor: 'move',
                fontSize: HEADER_TEXT_SIZE,
                fontWeight: 'bold',
                textAlign: 'center',
                borderBottom: '1px solid #404040',
                width: '100%',
                margin: '0',
                padding: '5px 0',
            });
            this.tierBox.appendChild(header);
            this.contentArea = document.createElement('div');
            this.contentArea.style.padding = '10px';
            this.tierBox.appendChild(this.contentArea);

            header.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));
            document.addEventListener('mousemove', this.drag.bind(this));
        },
        startRGBAnimation: function(element, delay) {
            let offset = 0;
            setInterval(() => {
                const lines = element.innerText.split('\n');
                element.innerHTML = lines.map(line => {
                    return Array.from(line).map((char, i) => {
                        let dynamicHue = (offset - i * 15 + 360) % 360;
                        return `<span style="color: hsl(${dynamicHue}, 100%, 50%)">${char}</span>`;
                    }).join('');
                }).join('<br>');
                offset = (offset - 5 + 360) % 360;
            }, delay);
        },
        startDrag: function(e) {
            this.isDragging = true;
            this.offsetX = e.clientX - this.tierBox.getBoundingClientRect().left;
            this.offsetY = e.clientY - this.tierBox.getBoundingClientRect().top;
        },
        drag: function(e) {
            if (this.isDragging) {
                this.tierBox.style.left = (e.clientX - this.offsetX) + 'px';
                this.tierBox.style.top = (e.clientY - this.offsetY) + 'px';
                localStorage.setItem('tierBoxTop', this.tierBox.style.top);
                localStorage.setItem('tierBoxLeft', this.tierBox.style.left);
            }
        },
        stopDrag: function() {
            this.isDragging = false;
        },
        onShowItemTooltip: function(item) {
            let combinedStats = {};
            if (item.stats) {
                combinedStats = { ...item.stats };
            }
            if (item.implicitStats) {
                for (let implicitStat of item.implicitStats) {
                    if (combinedStats[implicitStat.stat] !== undefined) {
                        combinedStats[implicitStat.stat] += implicitStat.value;
                    } else {
                        combinedStats[implicitStat.stat] = implicitStat.value;
                    }
                }
            }
            let { maxTier, maxValue, calculatedStats } = calculateTier(combinedStats);
            if (item.slot === 'twoHanded') maxValue /= 2;
            this.contentArea.innerHTML = `<strong style="font-weight: bold; color: #cccccc;">Tier: <span style="font-weight: bold; color: #cccccc;">${maxValue}</span></strong><br>`;
            let statsDisplayed = false;
            for (let stat in STAT_CONFIG) {
                if (calculatedStats[stat] !== undefined) {
                    let displayValue = (stat === 'addCritChance' || stat === 'addAttackCritChance' || stat === 'addSpellCritChance') ? calculatedStats[stat]/20 : calculatedStats[stat];
                    this.contentArea.innerHTML += `${stat}: ${displayValue}<br>`;
                    statsDisplayed = true;
                }
            }
            if (!statsDisplayed) this.contentArea.innerHTML += `<strong style="font-weight: bold; color: rgb(180, 180, 180)">N/A</strong>`;
            if (HIDING) this.tierBox.style.display = 'block';
        },
        onHideItemTooltip: function() {
            if (HIDING) this.tierBox.style.display = 'none';
        }
    });
});
