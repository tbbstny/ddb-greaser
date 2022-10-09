// ==UserScript==
// @name         DDB Greaser
// @namespace    https://github.com/tbbstny
// @version      0.2
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

GM_addStyle('.icon {background: #ffc0c0; width: 30px; height: 30px; border-radius: 50%; text-align: center; line-height: 30px; vertical-align: -25%; padding: 5px;');
console.log('TMKWTD Loaded');

var $ = window.jQuery;

(function() {
    'use strict';

    const documentModified = function(mutations, observer) {

        // Find Monster Name, and add link to TMKWTD search
        $.find('a.mon-stat-block__name-link').each(function(link) {
            var $el = $(link);
            if(!$el.siblings().length) {
                var href = "https://www.themonstersknow.com/?s=" + $el.text().trim();
                $el.after('<a href="'+ href + '" style="font-size: 20px; color: #822000; background: radial-gradient(30px circle at 50px 200px, #822000 50%, transparent 51%);" target="_blank"><iconify-icon icon="game-icons:behold" class="icon"></iconify-icon></a>');
            }
        });

    }

    // Watch DOM for changes
    const observer = new window.MutationObserver(documentModified);
    observer.observe(document, { "subtree": true, "childList": true, attributes: true, });
})();

