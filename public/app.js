var profileId;
var wallet = 0;
var packsOpened = 0;
var cashAdded = 0;
var timeoutFunctions = [];
var lastProfileUpdate = 0;
var sessionCash = 5000;

var collection = [];
var loadedBattleDeck = [];
var energyCards = [];
var commonCards = [];
var uncommonCards = [];
var rareCards = {};

var expansions = {
    'SWSH4': {
        name: 'Vivid Voltage',
        expansionSet: 'SWSH4',
        energy: 'SWSH'
    },
    'SWSH3': {
        name: 'Darkness Ablaze',
        expansionSet: 'SWSH3',
        energy: 'SWSH'
    },
    'SWSH2': {
        name: 'Rebel Clash',
        expansionSet: 'SWSH2',
        energy: 'SWSH'
    },
    'SWSH1': {
        name: 'Sword & Shield',
        expansionSet: 'SWSH1',
        energy: 'SWSH'
    },
    'SM12': {
        name: 'Cosmic Eclipse',
        expansionSet: 'SM12',
        energy: 'SMb'
    },
    'SM11': {
        name: 'Unified Minds',
        expansionSet: 'SM11',
        energy: 'SMb'
    },
    'SM10': {
        name: 'Unbroken Bonds',
        expansionSet: 'SM10',
        energy: 'SMb'
    },
    'SM9': {
        name: 'Team Up',
        expansionSet: 'SM9',
        energy: 'SMb'
    },
    'SM8': {
        name: 'Lost Thunder',
        expansionSet: 'SM8',
        energy: 'SMb'
    },
/* TODO: this card has no "regular rares" which is crashing the app! fix it.
Here may be why: "You can’t buy single booster packs of Dragon Majesty... they only sell them in
collector sets or 3 packs."
    'SM7b': {
        name: 'Dragon Majesty',
        expansionSet: 'SM7b',
        energy: 'SMb'
    },
*/
    'SM7': {
        name: 'Celestial Storm',
        expansionSet: 'SM7',
        energy: 'SMb'
    },
    'SM6': {
        name: 'Forbidden Light',
        expansionSet: 'SM6',
        energy: 'SMb'
    },
    'SM5': {
        name: 'Ultra Prism',
        expansionSet: 'SM5',
        energy: 'SMb'
    },
};

var preloadedCards = [];
var preloadsRemaining = 0;
  
$(document).ready(function() {
    $('#open-pack').click(function() {
        activateSection('pack');
        if (wallet < 4) {
            $('#status-message').html('Not enough money in your wallet! Packs cost $4.00');
            return;
        }

        playSound('#magic-spell');
        var pack = addPackToCollection();

        // render the generated pack!
        pack = shuffle(pack);
        renderCards(pack, 125, '#pack');

        wallet -= 4;
        packsOpened++;
        updateStats();
    });

    $('#view-pack').click(function() {
        activateSection('pack');
    });

    $('#view-collection').click(function() {
        collection = compileCollection(collection);

        activateSection('collection');
        renderCards(collection, 0, '#collection');
    });

    $('#main-actions').on('click', '#view-battle-deck', function() {
        loadedBattleDeck = compileCollection(loadedBattleDeck);

        activateSection('battle-deck');
        renderCards(loadedBattleDeck, 50, '#battle-deck');
    });

    $('.section').on('mouseover', '.pokemon-card', function() {
        if ($(this).hasClass('rare')) {
            playSound('#bigwhoosh');
            return;
        }
        playSound('#whoosh');
    });

    $('.add-cash').click(function() {
        var amountToAdd = parseInt($(this).attr('id').substring(7)); // e.g.: dollar-5 becomes 5
        if (amountToAdd > sessionCash) {
            $(this).removeClass('btn-outline-success');
            $(this).addClass('btn-outline-danger');
            return;
        }

        cashAdded += amountToAdd;
        wallet += amountToAdd;
        sessionCash -= amountToAdd;
        updateStats();

        $('.add-cash').hide();
    });

    $('.load-profile').click(function() {
        var apiEndpoint = apiHome + '/load_profile.php';
        profileId = $(this).text().toLowerCase();
        
        $.getJSON(
            apiEndpoint,
            {name: profileId},
            function(data) {
                wallet = data.wallet ?? 0;
                packsOpened = data.packsOpened ?? 0;
                cashAdded = data.cashAdded ?? 0;
                collection = data.collection ?? [];

                updateStats();
                collection = compileCollection(collection);
                activateSection('collection');
                renderCards(collection, 0, '#collection');
            }
        );
    });

    $('#collection').on('click', '.pokemon-card', function() {
return;
        if ($('#collection-click-action').val() == 'add-to-deck') {
            addToBattleDeck($(this));
        }
        if ($('#collection-click-action').val() == 'sell-extras') {
            sellExtras($(this));
        }
    });

    $('#battle-deck').on('click', '.pokemon-card', function() {
        var index = $(this).parent('.card-wrapper').index();
        loadedBattleDeck[index].quantity--;
        loadedBattleDeck = compileCollection(loadedBattleDeck);
        updateDeckStats();
        renderCards(loadedBattleDeck, 0, '#battle-deck');
    });

    $('.expansions').on('click', 'img', function() {
        loadCards($(this).data('expansion'));
    });

    const filterKeyUp = debounce(
        function() {
            if ($(this).val().length < 3) { return; }
            console.log('searching...');
            const needle = $(this).val().toUpperCase();
            
            // Loop through all list items, and hide those who don't match the search query
            $('.collection').find('.card-wrapper').each(function (index, element) {
                const haystack = $(element).find('img').attr('src').split('/').pop();
                
                if (haystack.toUpperCase().match(needle)) {
                    $(element).show();
                    return;
                }
                
                $(element).hide();
            });
        },
        250
    );
    $('#filterQuery').on('keyup', filterKeyUp);

    for (let key in expansions) {
        const value = expansions[key];
        $('.top.container').find('.expansions').append(`
            <img
                src="logos/${value.expansionSet}_Logo_EN.png"
                id="expansion-${value.expansionSet}"
                title="${htmlentities.encode(value.name)}"
                data-expansion="${value.expansionSet}"
            />
        `);
    }

    $('.spinner-border').hide();
});
