var apiHome = 'api';

(function(window){
	window.htmlentities = {
		/**
		 * Converts a string to its html characters completely.
         * @see https://ourcodeworld.com/articles/read/188/encode-and-decode-html-entities-using-pure-javascript
		 *
		 * @param {String} str String with unescaped HTML characters
		 **/
		encode : function(str) {
			var buf = [];
			
			for (var i=str.length-1;i>=0;i--) {
				buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
			}
			
			return buf.join('');
		},
		/**
		 * Converts an html characterSet into its original character.
		 *
		 * @param {String} str htmlSet entities
		 **/
		decode : function(str) {
			return str.replace(/&#(\d+);/g, function(match, dec) {
				return String.fromCharCode(dec);
			});
		}
	};
})(window);

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
})

function updateDeckStats() {
    let count = 0;
    $.each(loadedBattleDeck, function(key, value) {
        count += value.quantity;
    });
    $('#deck-cards').html(count);
}

/**
 * Load battle decks from the database, then return as a promise for post-processing
 * 
 */
function loadBattleDecks(profileId) {
    var apiEndpoint = apiHome + '/load_battledecks.php';
    
    return $.getJSON(
        apiEndpoint,
        function(data) {
            battleDecks = data;
        }
    );
}

/**
 * Sell extra copies of a card. Keep 4 copies.
 */
function sellExtras($thisImg) {
    const copiesToKeep = 4;
    $thisImg.animate(
        { left: "300px", opacity: 0 }, 250, function () { $thisImg.removeAttr('style'); $thisImg}
    );
    const index = $thisImg.parent('.card-wrapper').index();
    let card = collection[index];

    // client-side
    if (card.quantity <= copiesToKeep) {
        return;
    }
    sellQty = card.quantity - copiesToKeep;
    card.quantity = copiesToKeep;

    sellValue = sellQty * card.marketValue;
    wallet += sellValue;
    updateStats();
    $thisImg.parent('.card-wrapper').find('.quantity').html(`(x${copiesToKeep})`);

    if (!profileId) {
        return;
    }

    // server-side
    var apiEndpoint = apiHome + '/sell_extras.php';
    $.getJSON(
        apiEndpoint,
        {
            name: profileId,
            cardId: collection[index].cardId,
            sellQty: sellQty
        }
    );
}

function loadCollection(collectionId) {
    const apiEndpoint = apiHome + '/load_collection.php';
    return $.getJSON(
        apiEndpoint,
        {collectionId: collectionId},
        function(data) {
            loadedBattleDeck = data;

            return loadedBattleDeck;
        }
    );
}

function addToBattleDeck($thisImg) {
    $thisImg.animate(
        { left: "300px", opacity: 0 }, 250, function () { $thisImg.removeAttr('style'); $thisImg}
    );

    const index = $thisImg.parent('.card-wrapper').index();
    loadedBattleDeck.push({
        ...collection[index],
        quantity: 1,
    });
    loadedBattleDeck = compileCollection(loadedBattleDeck);
    updateDeckStats();
}

/**
 * Sort the collection by card number, then place energy cards at the end.
 * 
 * Find all instances of a given card and merge them into a single array element with an updated
 * 'quantity' field
 */
function compileCollection(collection) {
    var collectionClone = [...collection];
    collectionClone.sort(function(a, b) {
        let firstIdx = parseInt(a.cardId.match(/\d{3}/), 10);
        let secondIdx = parseInt(b.cardId.match(/\d{3}/), 10);

        if (a.rarity == 'energy' && b.rarity == 'energy') {
            return firstIdx - secondIdx;
        }
        if (a.rarity != 'energy' && b.rarity != 'energy') {
            if (a.expansionSet != b.expansionSet) {
                const expansionSort = Object.keys(expansions);
                firstIdx = expansionSort.indexOf(a.expansionSet);
                secondIdx = expansionSort.indexOf(b.expansionSet);
                
                return firstIdx - secondIdx;
            }

            return firstIdx - secondIdx;
        }

        // place energy cards at the end
        if (a.rarity == 'energy') {
            return 1;
        }
        if (b.rarity == 'energy') {
            return -1;
        }
    });

    var consolidatedCollection = [];
    for (var i = 0; i < collectionClone.length; i++) {
        if (collectionClone[i].quantity < 1) {
            // skip if quantity = 0
            continue;
        }
        if (consolidatedCollection.length == 0) {
            consolidatedCollection.push(collectionClone[i]);
            continue;
        }

        if (collectionClone[i].cardId != collectionClone[i - 1].cardId) {
            consolidatedCollection.push(collectionClone[i]);
            continue;
        }

        const lastIdx = consolidatedCollection.length - 1;
        consolidatedCollection[lastIdx].quantity += collectionClone[i].quantity;
    }
    return consolidatedCollection;
}

function addPackToCollection() {
    const pack = generatePack();

    // add this pack to the collection (client-side)
    for (let key in pack) {
        const card = pack[key];
        collection.push(card);
    }

    collection = compileCollection(collection);

    if (!profileId) {
        return pack;
    }

    // add this pack to the collection (server-side)
    saveCollection(pack, profileId, false, false);

    return pack;
}

/**
 * Save cards to a collection
 */
function saveCollection(pack, collectionName, isReplace, isNew, boxArt) {
    isReplace = isReplace ?? false;
    isNew = isNew ?? false;
    boxArt = boxArt ?? '';

    var apiEndpoint = apiHome + '/add_to_collection.php';
    var payload = {
        profileId: profileId ?? 'anonymous',
        collectionId: collectionName,
        cards: pack,
        isReplace: isReplace,
        isNew: isNew,
        boxArt: boxArt
    };
    $.post(apiEndpoint, payload, function (data) {
        if (data.status == 'error') {
            pokemonModal.error(data.statusMessage);
        }
    }, 'json');
}

function loadCards(expansion) {
    const expansionSet = expansions[expansion].expansionSet ?? 'SWSH1';
    const energyExpansion = expansions[expansion].energy ?? 'SWSH';
    const apiEndpoint = apiHome + '/load_cards.php';

    $('.top.container').find('.expansions img').removeClass('selected');
    $(`#expansion-${expansionSet}`).addClass('selected');

    $.getJSON(
        apiEndpoint,
        {
            expansionSet: expansionSet,
            energyExpansion: energyExpansion
        },
        function(data) {
            energyCards = data.energyCards ?? [];
            preloadImages(energyCards);

            commonCards = data.commonCards ?? [];
            preloadImages(commonCards);

            uncommonCards = data.uncommonCards ?? [];
            preloadImages(uncommonCards);

            rareCards = {
                '03 rare': data.rareCards ?? [],
                '04 rare holo': data.rareHoloCards ?? [],
                '05 rare ultra': data.rareUltraCards ?? [],
                '06 rare secret': data.rareSecretCards ?? [],
            };
            for (let key in rareCards) {
                const cards = rareCards[key];
                preloadImages(cards);
            }

        }
    );
}

function preloadImages(cards) {
    for (let key in cards) {
        const value = cards[key];

        const path = `cards/${value.expansionSet}/${value.imgSrc}`;
        if (preloadedCards[path]) { return; }

        preloadsRemaining++;
        let image = new Image();
        image.onload = function () {
            preloadsRemaining--;
            
            if (preloadsRemaining) {
                $('.spinner-border').show();
            } else {
                $('.spinner-border').hide();
            }
        }
        image.src = path;
        preloadedCards[path] = image;
    }
}

function saveProfile() {
    if (!profileId) {
        return;
    }

    var apiEndpoint = apiHome + '/save_profile.php';
    var payload = {
        name: profileId,
        wallet: wallet,
        packsOpened: packsOpened,
        cashAdded: cashAdded
    };

    $.post(
        apiEndpoint,
        payload,
        function(data) {
            console.log(data);
        },
        'json'
    );
}

function playSound(cssId) {
    const sound = $(cssId)[0];
    if (!sound) {
        return;
    }

    if ($('#typewriter-key')[0]) {
        $('#typewriter-key')[0].pause();
    }
    $('#whoosh')[0].pause();
    $('#bigwhoosh')[0].pause();
    sound.currentTime = 0;
    sound.play();
}

function renderCards(pack, timeInterval, cssId) {
    preloadImages(pack);

    $(cssId + ' .card-wrapper').remove();

    let time = timeInterval;
    $.each(pack, function (index, value) {
        timeoutFunctions.push(setTimeout(function () {
            let quantitySpan = '';
            if (value.quantity > 1) {
                quantitySpan = `<span class="quantity">(x${value.quantity})</span>`;
            }
            let symbolSpan = '';
            if (value.rarity != 'energy') {
                symbolSpan = `<span class="symbol"><img src="logos/${value.expansionSet}_Symbol.png" /></span>`;
            }

            $(cssId).append(`
                <div class="card-wrapper ${value.rarity}" data-rarity="${value.rarity}">
                    <img src="cards/${value.expansionSet}/${value.imgSrc}"
                        class="${value.rarity} pokemon-card front" />
                    <br />
                    ${symbolSpan}
                    <span class="rarity">${value.rarity}</span>
                    ${quantitySpan}
                </div>
            `);
        }, time));
        time += timeInterval;
    });
}

function generatePack() {
    let thisCard;
    let pack = [];

    // 1 random energy card
    const energyCardsClone = [...energyCards];
    thisCard = energyCards[Math.floor(Math.random() * energyCards.length)];
    addCardToPack(pack, thisCard, 'energy');

    // 6 random common cards
    let commonCardsClone = [...commonCards];
    commonCardsClone = shuffle(commonCardsClone);
    for (let i = 0; i < 6; i++) {
        thisCard = commonCardsClone.pop();
        addCardToPack(pack, thisCard, 'common');
    }

    // 3 random uncommon cards
    let uncommonCardsClone = [...uncommonCards];
    uncommonCardsClone = shuffle(uncommonCardsClone);
    for (let i = 0; i < 3; i++) {
        thisCard = uncommonCardsClone.pop();
        addCardToPack(pack, thisCard, 'uncommon');
    }

    // 1 random rare card of varying rarity
    let rareCardsClone = {};
    Object.assign(rareCardsClone, rareCards);

    const rarityKey = determineRarity();
    console.log(`Your rare card was a: ${rarityKey}!`);
    rareCardsClone = rareCardsClone[rarityKey];
    thisCard = rareCardsClone[Math.floor(Math.random() * rareCardsClone.length)];

    const rarity = rarityKey.substring(3);
    $('#status-message').html(`You got a ${rarity} card!`);
    addCardToPack(pack, thisCard, rarity);
    
    return pack;
}

function addCardToPack(pack, thisCard, rarity) {
    pack.push({
        cardId: thisCard.cardId,
        rarity: rarity,
        marketValue: thisCard.marketValue ?? 0,
        imgSrc: thisCard.imgSrc,
        expansionSet: thisCard.expansionSet,
        quantity: 1,
    });
}

/**
 * Shuffles array in place.
 * @see https://stackoverflow.com/a/6274381
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/**
 * Returns one of the following rarity keys:
 * - rare
 * - rare holo (1 in every 4 packs = 36/144)
 * - rare ultra (1 in every 16 packs = 9/144)
 * - rare secret (1 in every 72 packs = 2/144)
 */
function determineRarity() {
    var rand = Math.floor(Math.random() * 144) + 1; // roll a D144

    if (rand >= 1 && rand <= 2) { // range size = 2
        return '06 rare secret';
    }

    if (rand >= 11 && rand <= 19) { // range size = 9
        return '05 rare ultra';
    }

    if (rand >= 21 && rand <= 56) { // range size = 36
        return '04 rare holo';
    }

    return '03 rare';
}

function activateSection(name) {
    for (var i = 0; i < timeoutFunctions.length; i++) {
        clearTimeout(timeoutFunctions[i]);
    }

    $('.section').hide();
    $('.section.' + name).show();
}

function updateStats() {
    if (wallet >= 4) {
        $('#open-pack').removeAttr('disabled');
    } else {
        $('#open-pack').attr('disabled', 'disabled');
    }

    $('#wallet').html(formatter.format(wallet));
    $('#packs-opened').html(packsOpened);
    
    const uniqueCardCount = collection.reduce(function (values, v) {
        if (!values.set[v.cardId]) {
            values.set[v.cardId] = 1;
            values.count++;
        }
        return values;
    }, { set: {}, count: 0 }).count;
    $('#unique-card-count').html(uniqueCardCount);

    now = Date.now();
    if (now - lastProfileUpdate > 2000) { // wait 2 seconds before saving again
        saveProfile();
        lastProfileUpdate = now;
    }
}

/**
 * A collection of cards is usually stored this way:
 * [
 *  {cardId: "SWSH1-049", ..., quantity: 2},
 *  {cardId: "SWSH1-050", ..., quantity: 3},
 * ]
 * This function serves to create a list this way:
 * - SWSH1-049
 * - SWSH1-049
 * - SWSH1-050
 * - SWSH1-050
 * - SWSH1-050
 */
function expandDeck(deck) {
    let cards = [];

    for (let cardKey in deck) {
        let cardValue = deck[cardKey];
        for (let count = 0; count < cardValue.quantity; count++) {
            cards.push(`${cardValue.expansionSet}/${cardValue.imgSrc}`);
        }
    }

    return cards;
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * @see Credit David Walsh (https://davidwalsh.name/javascript-debounce-function)
 */
function debounce(func, wait, immediate) {
    let timeout;

    return function executedFunction() {
        const context = this;
        const args = arguments;

        const later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);

        timeout = setTimeout(later, wait);

        if (callNow) func.apply(context, args);
    };
};
