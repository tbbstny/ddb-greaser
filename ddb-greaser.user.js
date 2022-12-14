// ==UserScript==
// @name         D&D Beyond Greaser
// @namespace    https://github.com/tbbstny/ddb-greaser
// @version      0.1.0
// @description  D&D Beyond DM Utilities
// @author       3T
// @match        https://www.dndbeyond.com/*
// @updateURL	 https://github.com/tbbstny/ddb-greaser/raw/main/ddb-greaser.user.js
// @downloadURL	 https://github.com/tbbstny/ddb-greaser/raw/main/ddb-greaser.user.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      https://code.iconify.design/iconify-icon/1.0.0/iconify-icon.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.3.2/math.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/mark.js/8.11.1/jquery.mark.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==
/* globals jQuery, $, math, waitForKeyElements */
console.info('D&D Beyond Greaser Starting');
const $ = window.jQuery;

/* eslint-disable no-multi-spaces */
const THE_MONSTERS_KNOW = "the_monsters_know";
const PLAYER_DEFENSE    = "player_defense";
const GREASER_STAT      = "ddb_greaser_stat";
const PARENTHETICALS    = /\(.*\)/;

const MONSTER_CONTAINER = `.encounter-details-monster-summary-info-panel,.encounter-details__content-section--monster-stat-block,.combat-tracker-page__content-section--monster-stat-block,.monster-details-modal__body`;
const MONSTER_NAME      = `.mon-stat-block__name`;
const DIS_ADVANTAGE     = ".mon-stat-block :contains(' advantage'), .mon-stat-block :contains(' disadvantage')";

const TMK_BLOCK = `<div class="${GREASER_STAT} mon-stat-block__description-block">
    <div class="mon-stat-block__description-block-heading">The Monsters Know</div>
    <div class="mon-stat-block__description-block-content">
        <<premises>>
    </div>
</div>`
/* eslint-enable */

// Style for "The Monsters Know What They're Doing" search icon
// const COLOR = '#8F4A5F';
// const BACKGROUND = '#E2C0C6';
//const COLOR = '#BEE70C';
//const BACKGROUND = '#2C6A35';
const COLOR = '#344F01'; // '#006400' // '#2C6A35';
const BACKGROUND = '#CFEA9C'; // '#90EE90' // '#BEE70C';
GM_addStyle(`.${THE_MONSTERS_KNOW} {padding: 0 0 0 5px}`);
GM_addStyle(`.icon {color: ${COLOR}; background: ${BACKGROUND}; font-size: 30px; width: 30px; height: 30px; padding: 0; border-radius: 50%; text-align: center; line-height: 30px; vertical-align: -25%;`);
GM_addStyle(`.${PLAYER_DEFENSE} {color: ${COLOR}; background: ${BACKGROUND}; border-radius: 5%;`);
GM_addStyle(`mark {color: ${COLOR}; background: ${BACKGROUND}; font-style: italic; font-weight: bold;}`);
GM_addStyle(`.ddb_greaser_stat.mon-stat-block__description-block, .ddb_greaser_stat .mon-stat-block__description-block-heading {color: ${COLOR};}`);
GM_addStyle(`.ddb_greaser_stat .mon-stat-block__description-block-heading {border-bottom: 1px solid ${COLOR};}`);


// See _**Commoner**_ in _The Monsters Know What They're Doing
const HI = '11';
const LO = '10';
const ANY = '--';

const assumptions = {
    'base_assumptions': [
        '<p><strong>Survival</strong> Most creatures want, first and foremost, to survive, and will flee when Seriously Wounded.  Exceptions are constructs, undead, fanatics, and intelligent creatures who believe they will be hunted down.</p>',
        '<p><strong>Action Economy</strong> Any creature that has evolved to survive in a given environment instinctively knows how to make the best use of its particular adaptations (seeks the most favorable result allowed by combining available <em>movement, actions, bonus actions</em> and <em>reactions</em>).</p>'
    ],
    'defense': {
         '--' : '<p><strong>Primary Defense</strong>',
        'CON' : '<br/><strong>CON</strong> Relies on toughness to absorb damage.',
        'DEX' : '<br/><strong>DEX</strong> Relies on nimbleness and mobility to avoid damage.'
    },
    'offense': {
         '--' : '<p><strong>Primary Offense</strong>',
        'STR' : '<br/><strong>STR</strong> Prefers doing brute-force damage.',
        'DEX' : '<br/><strong>DEX</strong> Prefers finesse or ranged attacks.',
        'INT' : '<br/><strong>INT</strong> Relies on <em>Reasoning</em> and <em>Memory</em> for tactics or Fight, Flee, or Freeze response.',
        'WIS' : '<br/><strong>WIS</strong> Relies on <em>Perception</em> and </em>Insight</em> for tactics or Fight, Flee, or Freeze response.',
        'CHA' : '<br/><strong>CHA</strong> Relies on <em>Force of Personality</em> for tactics or Fight, Flee, or Freeze response.'
    },
    // STR,DEX,CON
    // @see also "Commoner" in The Monsters Know What They're Doing
    'ability_contour' : {
        '--|--|--' : '<p><strong>Ability Contour</strong>, particularly physical abilities scores, influence fighting styles.',
        'Lo|--|--' : '<br/><strong>↓STR</strong> Seeks safety in numbers (usually at least 3:1, but adjust based on smarts).  Lacking both Strength and numbers, they scatter/flee from danger.',
        '--|--|Lo' : '<br/><strong>↓CON</strong> Prefers to attack from range, from hiding, or both.',
        '--|Lo|--' : '<br/><strong>↓DEX</strong> Chooses battles judiciously, because they are not likely to get out of a fight once engaged.',
        'Hi|--|Hi' : '<br/><strong>↑STR, ↑CON</strong> A brute that welcomes close-quarter slugfests.',
        'Hi|Hi|--' : '<br/><strong>↑STR, ↑DEX</strong> A hard-hitting predator or shock attacker that counts on finishing fights quickly; Often uses Stealth and goes for big-damage ambushes.',
        '--|Hi|Hi' : '<br/><strong>↑DEX, ↑CON</strong> A scrappy skirmisher that deals steady, moderate damage and doesn\'t mind battles of attrition.',
        'Lo|Hi|Lo' : '<br/><strong>↓STR, ↑DEX, ↓CON</strong> Snipes at range with missile weapons.',
        'Lo|Lo|Lo' : '<br/><strong>↓STR, ↓DEX, ↓CON</strong> Seeks to avoid fighting unless they have some sort of circumstantial advantage - or simply flees without hesitation; if it’s intelligent, it may lay traps.'
    },
    'intelligence' : {
        '14' : '<br/><strong>INT 14+</strong> Can not only plan but also accurately assess its enemies’ weaknesses and target accordingly.',
        '12' : '<br/><strong>INT 12-13</strong> Can come up with a good plan and coordinate with others; probably also has multiple ways of attacking and/or defending and knows which is better in which situation.',
         '8' : '<br/><strong>INT 8-11</strong> Is unsophisticated in their tactics and largely lacking in strategy, but it can tell when things are going wrong and adjust to some degree.',
         '1' : '<br/><strong>INT <= 7</strong> Operates wholly or almost from instinct.  Doesn\'t mean using features <em>ineffectively</em>, but that they have one preferred modus operandi and can\'t adjust if it stops working.'
    },
    'wisdom' : {
        '14' : '<br/><strong>WIS 14+</strong> Chooses its battles carefully and fights only when it’s sure it will win (or will be killed if it doesn\'t fight).',
        '12' : '<br/><strong>WIS 12-13</strong> Choose targets carefully and may even refrain from combat in favor of parley if it recognizes that it’s outmatched.',
        '8' : '<br/><strong>WIS 8-11</strong> Knows when to flee but is indiscriminate in choosing targets.',
        '1' : '<br/><strong>WIS <= 7</strong> Has an underdeveloped survival instinct and may wait too long to flee.'
    },
    'advantages' : [
        '<p><strong>Advantages</strong> Will <em>always</em> prefer to use features that gain an advantage (or imposes disadvantage on its enemy).  If it can’t, it may even shun a battle altogether.'
    ],
    'saves' : [
        '<p><strong>Saving Throws</strong> Will generally favor features that require a saving throw to avoid over a simple attacks, even if the expected damage may not be as great.'
    ],
    'alignment' : {
        '--0'     : '<p><strong>Alignment matters!</strong>',
        '--1'     : '<br/>Nearly all creatures, regardless of alignment, are territorial to some degree or another.',
        'good'    : '<br/><strong>Good</strong> tend to be friendly by default.',
        'neutral' : '<br/><strong>Neutral</strong> tend to be indifferent by default.',
        'evil'    : '<br/><strong>Evil</strong> tend to be hostile by default.',
        'lawful'  : '<br/><strong>Lawful</strong>, even lawful good creatures, will be hostile toward chaotic creatures causing ruckus.',
        'lawful'  : '<br/><strong>Intelligent Lawful</strong> may try to capture and imprison or enslave.',
        'chaotic' : '<br/><strong>Intelligent Chaotic</strong> will simply try to kill.',
    }
};


waitForKeyElements ('button.encounter-details-summary__group-item.encounter-details-monster', () => {
    // Remove highligts before changing monsters to keep from breaking D&D Beyond / Beyond 20
    let buttons = $('button.encounter-details-summary__group-item.encounter-details-monster');
    buttons.on('click', function(event){
        $(DIS_ADVANTAGE).unmark();
        $(":contains(saving throw)").unmark();
        removeMonsterPlayerDefenseStat();
    });
});

(function() {
    'use strict';
    var last_monster_name = null;

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


function grease() {
    addTMKSearchLink();

    addMonsterPlayerDefenseStat();

    let hp = refineHP();
    addTMKWTDTactic(hp.MIN, hp.MAX);
}

function degrease() {
    $(`.${THE_MONSTERS_KNOW}`).remove();
    $(`.${PLAYER_DEFENSE}`).remove();
    $(`.${GREASER_STAT}`).remove();
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
 * Add Player Defense Stat (12 + Monster's To Hit bonus) to the text.
 */
function addMonsterPlayerDefenseStat() {
    let $playerDefense = $('p:contains(" to hit")');
    $playerDefense.each(function(i, p) {
        let match = $(p).text().match(/([+-][0-9]+) to hit/);
        let toHitBonus = match[1]

        $(p).contents().each((j, node) => {
            var $node = $(node);
            if(node.nodeType === 3 && / to hit/.test(node.nodeValue)) {
                var playerDefense = math.evaluate(`${toHitBonus} + 12`);
                $node[0].textContent=$node.text().replace(' to hit', ` to hit (${playerDefense} Player Defense)`);
            }
        });
    });

    $playerDefense.markRegExp(/\(.* Player Defense\)/);
}

/**
 * Remove Player Defense Stat (12 + Monster's To Hit bonus) from the text.
 */
function removeMonsterPlayerDefenseStat() {
    let $playerDefense = $('p:contains(" Player Defense")');
    $playerDefense.unmark();
    $playerDefense.each(function(i, p) {
        $(p).contents().each((j, node) => {
            var $node = $(node);
            if(node.nodeType === 3 && / Player Defense/.test(node.nodeValue)) {
                $node[0].textContent=$node.text().replace(/\(.* Player Defense\)/g, '');
            }
        });
    });
}

/*
 * Monster Hits = Round HP to closes 10 then divide by 10.
 * @see also: https://youtu.be/MABlOHYommI
 */
function refineHP() {
    let MIN, MAX;

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

        MIN = math.evaluate(`${numDie} ${operator} ${bonus}`);
        MAX = math.evaluate(`${numDie}*${typeDie} ${operator} ${bonus}`);
        console.log(`MIN: ${MIN}, MAX: ${MAX}`);

        $HP.find('.mon-stat-block__attribute-data-value').after(`<span class="${GREASER_STAT}"> [${MIN}..${MAX}]`);

        addProfDMHits($HP, MIN, MAX);
        addTMKWTDFlee($HP, MIN, MAX);
    });

    return {MIN: MIN, MAX: MAX};
}

function addMonsterRangeStats(attribute, $el, min, max, avg) {
    const stat_block = `<div class="${GREASER_STAT} mon-stat-block__attribute"><span class="mon-stat-block__attribute-label">${attribute}</span> <span class="mon-stat-block__attribute-data"><span class="mon-stat-block__attribute-data-value">${avg}</span> <span class="hit_range">[${min}..${max}]</span>`
    $el.after(`${stat_block}`);
}

/*
 * Monster Hits = Round HP to closes 10 then divide by 10.
 * @see also: https://youtu.be/MABlOHYommI
 */
function addProfDMHits($el, min, max) {
    const MIN = Math.max(1, Math.round(min / 10));
    const MAX = Math.round(max / 10);
    const AVG = Math.max(1, Math.round(((min + max) / 2) / 10));
    addMonsterRangeStats('Hits', $el, MIN, MAX, AVG);
}

/*
 * Monster Hits = Round HP to closes 10 then divide by 10.
 * @see also: https://youtu.be/MABlOHYommI
 */
function addTMKWTDFlee($el, min, max) {
    const MIN = Math.max(1, Math.round(min * .40));
    const MAX = Math.round(max * .40);
    const AVG = Math.max(1, Math.round(((min + max) / 2) * .40));
    addMonsterRangeStats('Flee', $el, MIN, MAX, AVG);
}

function highLow(score, test) {
    return (test === '--') ? true : (test.toUpperCase() === 'LO' && (score <= LO)) ? true : (test.toUpperCase() === 'HI' && (score >= HI)) ? true : false;
}

function addTMKWTDTactic(hpMin, hpMax) {
    let attributes = {};
    $(`.ability-block__stat`).each((i, block) => {
        attributes[$(block).find(`.ability-block__heading`).text()] = +$(block).find(`.ability-block__score`).text();
    });

    let meta = $('.mon-stat-block__meta').text().replace(/(\w+) (\w+( \([^()]+\))?)\s?,?\s?(.*)/, "$1|$2|$4").split('|');
    attributes.size = meta[0];
    attributes.type = meta[1];
    attributes.alignment = meta[2];

    console.log(attributes);

    let premises = [];

    let hpAvg = (hpMin + hpMax) / 2;
//     premises.push(`<p><strong>Wounded.</strong>
//         Light|Moderate|Serious wounds.<br/>
//         Avg: ${Math.round(hpAvg*.9)}|${Math.round(hpAvg*.7)}|${Math.round(hpAvg*.4)} [Min: ${Math.round(hpMin*.9)}|${Math.round(hpMin*.7)}|${Math.round(hpMin*.4)}, Max: ${Math.round(hpMax*.9)}|${Math.round(hpMax*.7)}|${Math.round(hpMax*.4)}]<br/>
//         Will try to flee when seriously wounded, exceptions (a) fanatics or (b) intelligent beings who believe they’ll be hunted down and killed anyway.</p>`);

        assumptions.base_assumptions.forEach((assumption) => premises.push(assumption));

        for(const [key, value] of Object.entries(assumptions.alignment)) {
            if(key.includes(ANY) || attributes.alignment.toUpperCase().includes(key.toUpperCase())) { premises.push(value); }
        }

        let primary_defense_score = Math.max(attributes.CON, attributes.DEX);
        for(const [key, value] of Object.entries(assumptions.defense)) {
            if (key === ANY || attributes[key] === primary_defense_score) { premises.push(value); }
        }

        let primary_offense_score = Math.max(attributes.STR, attributes.DEX, attributes.INT, attributes.WIS, attributes.CHA);
        for(const [key, value] of Object.entries(assumptions.offense)) {
            if (key === ANY || attributes[key] === primary_offense_score) { premises.push(value); }
        }

        for(const [key, value] of Object.entries(assumptions.ability_contour)) {
            let pk = key.split('|');
            if(highLow(attributes.STR,pk[0]) && highLow(attributes.DEX,pk[1]) && highLow(attributes.CON,pk[2])) { premises.push(value); }
        }

        for(const key of Object.keys(assumptions.intelligence).reverse()) {
            if (attributes.INT >= +key) {
                premises.push(assumptions.intelligence[key]);
                break;
            }
        }

        for(const key of Object.keys(assumptions.wisdom).reverse()) {
            if (attributes.WIS >= +key) {
                premises.push(assumptions.wisdom[key]);
                break;
            }
        }

    // Callout "disadvantage" and "advantage" in the text
    let advantages = $(DIS_ADVANTAGE);
    if (advantages.length) {
        advantages.markRegExp(/(\badvantage\b|\bdisadvantage\b)/);
        assumptions.advantages.forEach((assumption) => premises.push(assumption));
    }

    // Callout "saving throw" in the text
    // let saves = $(":contains(saving throw)");
    const SAVING_THROWS = /DC \d+ (Strength|Dexterity|Constitution|Inteligence|Wisdom|Charisma) saving throw/i;
    let saves = $(".mon-stat-block p, .mon-stat-block li").filter(function () {
        return SAVING_THROWS.test($(this).text());
    });
    if (saves.length) {
        saves.markRegExp(SAVING_THROWS);
        assumptions.saves.forEach((assumption) => premises.push(assumption));
    }

    let block = TMK_BLOCK.replace('<<premises>>', premises.join(''));
    $('.mon-stat-block__description-blocks').after(`${block}`);
}
