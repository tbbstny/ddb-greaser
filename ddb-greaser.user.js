// ==UserScript==
// @name         D&D Beyond Greaser
// @namespace    https://github.com/tbbstny/ddb-greaser
// @version      0.0.3
// @description  D&D Beyond DM Utilities
// @author       3T
// @match        https://www.dndbeyond.com/*
// @updateURL	 https://github.com/tbbstny/ddb-greaser/raw/main/ddb-greaser.user.js
// @downloadURL	 https://github.com/tbbstny/ddb-greaser/raw/main/ddb-greaser.user.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://code.iconify.design/iconify-icon/1.0.0/iconify-icon.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.3.2/math.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==
/* globals jQuery, $, math */
console.info('D&D Beyond Greaser Starting');

const $ = window.jQuery;

/* eslint-disable no-multi-spaces */
const THE_MONSTERS_KNOW = "the_monsters_know";
const PLAYER_DEFENSE    = "player_defense";
const HP_RANGE          = "hp_range";
const HITS              = "prof_dm_hits";
const PARENTHETICALS    = /\(.*\)/;

const MONSTER_CONTAINER = `.encounter-details-monster-summary-info-panel,.encounter-details__content-section--monster-stat-block,.combat-tracker-page__content-section--monster-stat-block,.monster-details-modal__body`;
const MONSTER_NAME      = `.mon-stat-block__name`;
/* eslint-enable */

// Style for "The Monsters Know What They're Doing" search icon
GM_addStyle(`.${THE_MONSTERS_KNOW} {padding: 0 0 0 5px}`);
GM_addStyle(`.icon {color: #8F4A5F; background: #E2C0C6; font-size: 30px; width: 30px; height: 30px; padding: 0; border-radius: 50%; text-align: center; line-height: 30px; vertical-align: -25%;`);
GM_addStyle(`.${PLAYER_DEFENSE} {color: #8F4A5F; background: #E2C0C6; border-radius: 5%;`);

(function() {
    'use strict';
    var last_monster_name = null;
    var last_header = null;

    const documentModified = function(mutations, observer) {
        const monster = $(MONSTER_CONTAINER);
        const monster_name = monster.find(MONSTER_NAME).text();
        console.debug("Doc modified, new monster : ", monster_name, " !=? ", last_monster_name);
        if (monster_name !== last_monster_name) {
            last_monster_name = monster_name;
            degrease();
            grease();
        }
    }

    // Watch DOM for changes
    const observer = new window.MutationObserver(documentModified);
    observer.observe(document, { "subtree": true, "childList": true, attributes: true, });
    console.info('D&D Beyond Greaser Loaded');
})();


function degrease() {
    $(`.${THE_MONSTERS_KNOW}`).remove();
    $(`.${PLAYER_DEFENSE}`).remove();
    $(`.${HP_RANGE}`).remove();
    $(`.${HITS}`).remove();
}

function grease() {
    addTMKSearchLink();
    addMonsterPlayerDefenseStat();
    refineHP();
}


/**
 * Grab the Monster's name, and add a link to search for the Monsters at TMKWTD blog.
 */
function addTMKSearchLink() {
    $('a.mon-stat-block__name-link').each(function(index, link) {
        var $el = $(link);
        if(!$el.siblings().length) {
            var href = "https://www.themonstersknow.com/?s=" + $el.text().replace(PARENTHETICALS,'').trim().replaceAll(' ', '+');
            console.debug("Add TMK Search Link: " + href);
            $el.after(`<a class="${THE_MONSTERS_KNOW}" href="${href}" target="_blank"><iconify-icon icon="game-icons:behold" class="icon" title='Search "The Monsters Know What They&#39re Doing"'></iconify-icon></a>`);
        }
    });
}

/**
 * Inject Player Defense Stat (12 + Monster's To Hit bonus) to the text.
 */
function addMonsterPlayerDefenseStat() {
    $('p:contains(" to hit")').each(function(i, p) {
        let match = $(p).text().match(/([+-][0-9]+) to hit/);
        let toHitBonus = match[1]

        $(p).contents().each((j, node) => {
            var $node = $(node);
            if(node.nodeType === 3 && / to hit/.test(node.nodeValue)) {
                var playerDefense = math.evaluate(`${toHitBonus} + 12`);
                $node[0].textContent=$node.text().replace(' to hit', ` to hit (${playerDefense} Player Defense)`);
                // $( ` <span class="${PLAYER_DEFENSE}">(${playerDefense} Player Defense)</p>` ).appendTo($(p));
            }
        });
    });
}

/*
 * Monster Hits = Round HP to closes 10 then divide by 10.
 * @see also: https://youtu.be/MABlOHYommI
 */
function refineHP() {
    $('.mon-stat-block__attribute-label:contains("Hit Points")').each(function(i, hp) {
        let $HP = $(hp).parent();
        console.log("Avg HP: " + $HP.find('.mon-stat-block__attribute-data-value').text());
        console.log("Extra: " + $HP.find('.mon-stat-block__attribute-data-extra').text());

        let matches = /(\d+)d(\d+)\s*([+-])*\s*(\d*)/.exec($HP.find('.mon-stat-block__attribute-data-extra').text());

        let numDie = matches[1];
        let typeDie = matches[2];
        let operator = matches[3] || '+';
        let bonus = matches[4] || "0";
        console.log(`${numDie}d${typeDie} ${operator} ${bonus}`);

        const MIN = math.evaluate(`${numDie} ${operator} ${bonus}`);
        const MAX = math.evaluate(`${numDie}*${typeDie} ${operator} ${bonus}`);
        console.log(`MIN: ${MIN}, MAX: ${MAX}`);

        $HP.find('.mon-stat-block__attribute-data-value').after(` <span class="${HP_RANGE}">[${MIN}..${MAX}]`);

        addProfDMHits($HP, MIN, MAX);
    });
}

/*
 * Monster Hits = Round HP to closes 10 then divide by 10.
 * @see also: https://youtu.be/MABlOHYommI
 */
function addProfDMHits($el, min, max) {
    const MIN = Math.max(1, Math.round(min / 10));
    const MAX = Math.round(max / 10);
    const AVG = Math.max(1, Math.round(((min + max) / 2) / 10));
    let abc = `<div class="${HITS} mon-stat-block__attribute"><span class="mon-stat-block__attribute-label">Hits</span> <span class="mon-stat-block__attribute-data"><span class="mon-stat-block__attribute-data-value">${AVG}</span> <span class="hit_range">[${MIN}..${MAX}]</span>`
    $el.after(`${abc}`);
}
