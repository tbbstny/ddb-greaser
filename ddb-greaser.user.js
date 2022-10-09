// ==UserScript==
// @name         D&D Beyond Greaser
// @namespace    https://github.com/tbbstny/ddb-greaser
// @version      0.0.2
// @description  D&D Beyond DM Utilities
// @author       3T
// @match        https://www.dndbeyond.com/*
// @updateURL	 https://github.com/tbbstny/ddb-greaser/raw/main/tmkwtd.user.js
// @downloadURL	 https://github.com/tbbstny/ddb-greaser/raw/main/tmkwtd.user.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://code.iconify.design/iconify-icon/1.0.0/iconify-icon.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

const $ = window.jQuery;

const THE_MONSTERS_KNOW = "the_monsters_know";
const PARENTHETICALS    = /\(.*\)/;

const MONSTER_CONTAINER = `.encounter-details-monster-summary-info-panel,.encounter-details__content-section--monster-stat-block,.combat-tracker-page__content-section--monster-stat-block,.monster-details-modal__body`;
const MONSTER_NAME      = `.mon-stat-block__name`;

// Style for "The Monsters Know What They're Doing" search icon
GM_addStyle(`.${THE_MONSTERS_KNOW} {padding: 0 0 0 5px}`);
GM_addStyle(`.icon {color: #8F4A5F; background: #E2C0C6; font-size: 30px; width: 30px; height: 30px; padding: 0; border-radius: 50%; text-align: center; line-height: 30px; vertical-align: -25%;`);


(function() {
    'use strict';
    var last_monster_name = null;

    const documentModified = function(mutations, observer) {
        const monster = $(MONSTER_CONTAINER);
        const monster_name = monster.find(MONSTER_NAME).text();
        console.log("Doc modified, new monster : ", monster_name, " !=? ", last_monster_name);
        if (monster_name !== last_monster_name) {
            last_monster_name = monster_name;
            degrease();
            grease();
        }
    }

    // Watch DOM for changes
    const observer = new window.MutationObserver(documentModified);
    observer.observe(document, { "subtree": true, "childList": true, attributes: true, });
    console.log('D&D Beyond Greaser Loaded');
})();


function degrease() {
    $(`.${THE_MONSTERS_KNOW}`).remove();
}

function grease() {
    addTMKSearchLink();
}


/**
 * Find Monster Name, and add link to TMKWTD search
 */
function addTMKSearchLink() {
    $('a.mon-stat-block__name-link').each(function(index, link) {
        var $el = $(link);
        if(!$el.siblings().length) {
            var href = "https://www.themonstersknow.com/?s=" + $el.text().replace(PARENTHETICALS,'').trim().replaceAll(' ', '+');
            console.log("Add TMK Search Link: " + href);
            $el.after(`<a class="${THE_MONSTERS_KNOW}" href="${href}" target="_blank"><iconify-icon icon="game-icons:behold" class="icon" title='Search "The Monsters Know What They&#39re Doing"'></iconify-icon></a>`);
        }
    });
}
