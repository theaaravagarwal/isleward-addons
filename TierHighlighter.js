// ==UserScript==
// @name        Highlighter
// @namespace   Isleward.Addon
// @match       https://play.isleward.com/*
// @match       https://ptr.isleward.com/*
// @grant       none
// @version     1.0
// @author      Siege
// @description Highlights items certain items in the inventory
// ==/UserScript==

// Prefs Config
const DECIMAL_PLACES = 2; // Decimal places to round to during calculation
const TARGET = 2; // Target tier to highlight
const TARGET_DAMAGE = 1000; // Target damage to highlight (The perfection of the damage)
const FILL_COLOR = "rgba(255, 215, 0, 0.5)"; // Static fill color (gold color)
const BORDER_COLOR = "rgba(255, 215, 0, 1)"; // Static border color (gold)

// RGB Config
const RGB_ENABLED = true; // Toggle RGB wave effect
const RGB_OPACITY = 0.6; // Opacity for the RGB fill background (0 to 1)
const RGB_DELAY = 5; // Delay for the fill animation (higher = slower) (in ms)
const WAVE_SPEED = 0.75; // Speed of the wave animation (higher = slower)
const WAVE_INTENSITY = 15; // How intense the "wave" is (higher = more intense)

// Stat Config
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
    magicFind: { weight: 1/2, types: ['lynx', 'owl', 'bear'], maxStat: 15 },
    elementAllResist: { weight: 1/2, types: ['lynx', 'owl', 'bear'], maxStat: 10 },
    manaMax: { weight: 1/2, types: ['lynx'], maxStat: 8 },
    elementPercent: { weight: 1/2, types: ['lynx', 'owl'], maxStat: 3 }
};

function calculateTier(stats) {
    let tiers = { bear: 0, lynx: 0, owl: 0 };
    for (let stat in STAT_CONFIG) {
        let statValue = stats[stat] || 0;
        let { weight, maxStat, types } = STAT_CONFIG[stat];
        for (let type of types) {
            if ((type === 'owl' && (stat === 'addAttackCritMultiplier' || stat === 'addAttackCritChance')) ||
                (type === 'lynx' && (stat === 'addSpellCritMultiplier' || stat === 'addSpellCritChance')) ||
                (type === 'bear' && (stat === 'addSpellCritMultiplier' || stat === 'addSpellCritChance'))) {
                continue;
            }
            tiers[type] += (statValue / maxStat) * weight;
        }
    }
    let maxTierType = Object.keys(tiers).reduce((max, type) => tiers[type] > tiers[max] ? type : max, 'bear');
    let maxValue = tiers[maxTierType];
    return { maxTier: maxTierType, maxValue: maxValue.toFixed(DECIMAL_PLACES) };
}

function applyRGBWaveAnimation(element) {
    let offset = 0;
    setInterval(() => {
        const colors = [];
        for (let i = 0; i < 5; i++) {
            const dynamicHue = (offset + (i * (360 / 5))) % 360;
            colors.push(`hsl(${dynamicHue}, 100%, 50%)`);
        }
        element.style.backgroundImage = `linear-gradient(45deg, ${colors.join(', ')})`;
        element.style.opacity = RGB_OPACITY;
        offset = (offset - WAVE_SPEED + 360) % 360;
    }, RGB_DELAY);
}

function createStaticHighlight() {
    const highlight = $('<div class="highlight-tint"></div>').css({
        "position": "absolute",
        "top": "0",
        "left": "0",
        "width": "100%",
        "height": "100%",
        "background-color": FILL_COLOR,
        "pointer-events": "none",
    });
    return highlight;
}

function createRGBBorderAnimation() {
    const highlight = $('<div class="highlight-tint-border"></div>').css({
        "position": "absolute",
        "top": "0",
        "left": "0",
        "width": "100%",
        "height": "100%",
        "pointer-events": "none",
        "border-radius": "5px",
        "border": "2px solid transparent",
    });
    let offset = 0;
    setInterval(() => {
        const colors = [];
        for (let i = 0; i < 5; i++) {
            const dynamicHue = (offset + (i * (360 / 5))) % 360;
            colors.push(`hsl(${dynamicHue}, 100%, 50%)`);
        }
        highlight.css("border", `2px solid ${colors.join(', ')}`);
        offset = (offset - WAVE_SPEED + 360) % 360;
    }, RGB_DELAY);
    return highlight;
}

function injectCSS() {
    const style = document.createElement('style');
    style.innerHTML = `
        .highlight-tint, .highlight-tint-border {
            transition: background-color 0.1s linear, border-color 0.1s linear;
        }
    `;
    document.head.appendChild(style);
}

function main() {
    if ($(".ui-container .uiInventory").is(":visible")) {
        $('.uiInventory .grid .item').each(function () {
            const itemData = $(this).data('item');
            if (!itemData) return;
            let combinedStats = {};
            if (itemData.stats) combinedStats = { ...itemData.stats };
            if (itemData.implicitStats) {
                for (let implicitStat of itemData.implicitStats) {
                    if (combinedStats[implicitStat.stat] !== undefined) combinedStats[implicitStat.stat] += implicitStat.value;
                    else combinedStats[implicitStat.stat] = implicitStat.value;
                }
            }
            let { maxTier, maxValue } = calculateTier(combinedStats);
            if (itemData.slot === 'twoHanded') maxValue /= 2;
            let highlight = false;
            if (itemData.spell && itemData.spell.rolls && itemData.spell.rolls.damage) {
                const damage = itemData.spell.rolls.damage * 100;
                if (damage >= TARGET_DAMAGE) highlight = true;
            }
            if (parseFloat(maxValue) >= TARGET || highlight) {
                if ($(this).find('.highlight-tint').length === 0) {
                    const highlightElement = RGB_ENABLED ? createStaticHighlight() : createStaticHighlight();
                    const borderHighlight = RGB_ENABLED ? createRGBBorderAnimation() : null;
                    $(this).append(highlightElement);
                    if (borderHighlight) $(this).append(borderHighlight);
                    if (RGB_ENABLED) {
                        applyRGBWaveAnimation($(this).find('.highlight-tint')[0]);
                    }
                }
            } else {
                $(this).find('.highlight-tint').remove();
                $(this).find('.highlight-tint-border').remove();
            }
        });
    }
}

function check() {
    setInterval(() => {
        if ($(".ui-container .uiInventory").is(":visible")) main();
    }, 1);
}

function defer(method) {
    if (window.jQuery) method();
    else setTimeout(() => defer(method), 10);
}

defer(() => {
    injectCSS();
    check();
});
