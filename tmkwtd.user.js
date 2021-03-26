// ==UserScript==
// @name         TMKWTD
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.dndbeyond.com/*
// @updateURL		 https://github.com/tbbstny/ddb-and-tmkwtd/raw/main/tmkwtd.user.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

var $ = window.jQuery;

(function() {
    'use strict';

    const documentModified = function(mutations, observer) {

        // Find Monster Name, and add link to TMKWTD search
        $.find('a.mon-stat-block__name-link').each(function(link) {
            var $el = $(link);
            if(!$el.siblings().length) {
                var href = "https://www.themonstersknow.com/?s=" + $el.text().trim();
                $el.after('<a href="'+ href + '" style="font-size: 20px; color: #822000;" target="_blank">TMK</a>');
            }
        });

    }

    // Watch DOM for changes
    const observer = new window.MutationObserver(documentModified);
    observer.observe(document, { "subtree": true, "childList": true, attributes: true, });
})();

