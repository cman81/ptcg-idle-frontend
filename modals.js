var pokemonModal = {};

$(function() {
    $('#pokemonModal').on('show.bs.modal', function(event) {
        let $button = $(event.relatedTarget); // Button that triggered the modal
        let operation = $button.data('operation'); // Extract info from data-* attributes
        
        // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
        // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
        let $modal = $(this);
        pokemonModal[operation]($modal, $button.data());
    });
});

pokemonModal.save = function($modal, buttonData) {
    $modal.find('.modal-title').html('Save Deck');
    $modal.find('.modal-body').html(`<p>Which deck do you want to save to?</p>`);
    $modal.find('.modal-footer').html(`
        <button type="button" class="btn btn-primary btn-sm"
            data-target="#pokemonModal" data-operation="saveNew">
            Save a new deck
        </button>
    `);

    loadBattleDecks(profileId).then(function() {
        for (let key in battleDecks) {
            const value = battleDecks[key];
            $modal.find('.modal-body').append(`
                <div class="deck-item">
                    <img src="cards/${value.boxArt}" data-dismiss="modal"
                        data-collection-id="${value.collectionId}"/><br />
                    <span class="deck-name">${value.collectionName}</span>
                </div>
            `);
        }
    });
    

    $('#pokemonModal')
        .off('click', '.modal-footer button')
        .on('click', '.modal-footer button', function() {
            const operation = $(this).data('operation'); // Extract info from data-* attributes

            if (operation != 'saveNew') {
                return;
            }

            pokemonModal.saveNew($modal);
        })

    $('#pokemonModal')
        .off('click', '.modal-body img')
        .on('click', '.modal-body img', function() {
            let deckName = $(this).parent().find('.deck-name').text();
            saveCollection(loadedBattleDeck, deckName, true, false);
        });
};

pokemonModal.load = function($modal, buttonData) {
    $modal.find('.modal-title').html('Load Deck');
    $modal.find('.modal-body').html(`<p>Which deck do you want to load?</p>`);
    $modal.find('.modal-footer').html('');

    loadBattleDecks(profileId).then(function() {
        for (let key in battleDecks) {
            const value = battleDecks[key];
            $modal.find('.modal-body').append(`
                <div class="deck-item">
                    <img src="cards/${value.boxArt}" data-dismiss="modal"
                        data-collection-id="${value.collectionId}"/><br />
                    <span class="deck-name">${value.collectionName}</span>
                </div>
            `);
        }
    });

    $('#pokemonModal')
        .off('click', '.modal-body img')
        .on('click', '.modal-body img', function() {
            const key = $(this).parent().index('.deck-item');
            loadCollection(battleDecks[key].collectionName).then(function() {
                loadedBattleDeck = compileCollection(loadedBattleDeck);
                updateDeckStats();

                renderCards(loadedBattleDeck, 50, '#battle-deck');
            });
        });
};

pokemonModal.saveNew = function($modal, buttonData) {
    $modal.find('.modal-title').html('Save a new deck');
    $modal.find('.modal-body').html(`
        <div class="form-group">
            <label for="exampleInputEmail1">Deck Name</label>
            <input type="text" class="form-control" id="new-deck-name" aria-describedby="nameHelp" placeholder="Enter Name">
            <small id="nameHelp" class="form-text text-muted">Make it something cool!</small>
        </div>
        <p>Which card do you want to use as the deckbox?</p>
    `);
    $modal.find('.modal-footer').html('');

    for (let key in loadedBattleDeck) {
        const value = loadedBattleDeck[key];
        $modal.find('.modal-body').append(`
            <div class="deck-item">
                <img src="cards/${value.expansionSet}/${value.imgSrc}" data-dismiss="modal" />
            </div>
        `);
    }

    $('#pokemonModal')
        .off('click', '.modal-body img')
        .on('click', '.modal-body img', function() {
            const key = $(this).parent().index('.deck-item');
            const boxArt = `${loadedBattleDeck[key].expansionSet}/${loadedBattleDeck[key].imgSrc}`;
            saveCollection(loadedBattleDeck, $('#new-deck-name').val(), true, true, boxArt);
        });
};

pokemonModal.clearDeck = function($modal, buttonData) {
    $modal.find('.modal-title').html('Are you sure?');
    $modal.find('.modal-body').html(`
        Click 'Clear Deck' to remove all cards from your deck. They will remain in your collection.
    `);
    $modal.find('.modal-footer').html(`
        <button type="button" class="btn btn-danger" data-dismiss="modal">Clear Deck</button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
    `);

    $('#pokemonModal')
        .off('click', '.modal-footer .btn-danger')
        .on('click', '.modal-footer .btn-danger', function() {
            loadedBattleDeck = [];
            updateDeckStats();
            renderCards(loadedBattleDeck, 0, '#battle-deck');
        });
}

pokemonModal.error = function($modal, buttonData) {
    $modal = $modal ?? $('#modal');

    $modal.find('.modal-title').html('Error!');
    $modal.find('.modal-body').html(errorMessage);
    $modal.find('.modal-footer').html('<button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>');
}

pokemonModal.gameLoadDeck = function($modal, buttonData) {
    $modal.find('.modal-title').html('Load Deck');
    $modal.find('.modal-body').html(`<p>Which deck do you want to load?</p>`);
    $modal.find('.modal-footer').html('');

    loadBattleDecks(profileId).then(function() {
        for (let key in battleDecks) {
            const value = battleDecks[key];
            $modal.find('.modal-body').append(`
                <div class="deck-item">
                    <img src="cards/${value.boxArt}" data-dismiss="modal"
                        data-collection-id="${value.collectionId}"/><br />
                    <span class="deck-name">${value.collectionName}</span>
                </div>
            `);
        }
    });

    $('#pokemonModal')
        .off('click', '.modal-body img')
        .on('click', '.modal-body img', function() {
            const key = $(this).parent().index() - 1;
            const thisCollectionName = battleDecks[key].collectionName;
            const whichPlayer = buttonData.player;
            
            sendGameMessage(
                getPlayerId(whichPlayer),
                'judge',
                'useDeck',
                { collectionName: thisCollectionName }
            )
                .then(function(collectionName) {
                    return loadCollection(collectionName)
                })
                .then(function(compressedCardCollection) {
                    unpackCardCollection('myself', thisCollectionName, compressedCardCollection);
                });
        });
};

pokemonModal.gameMoveSpecificCard = function($modal, buttonData) {
    $modal.find('.modal-title').html('Move a specific card');
    $modal.find('.modal-body').html(`<p>Which card do you want to move?</p>`);
    $modal.find('.modal-footer').html('');

    let whichPlayer = buttonData.whichPlayer;
    let playerId = getPlayerId(whichPlayer);
    let cards = gameState[playerId][buttonData.from].cards;
    let images = deckImages[playerId];
    for (let key in cards) {
        const cardIdx = cards[key];
        const value = images[cardIdx];
        $modal.find('.modal-body').append(`
            <div class="deck-item">
                <img src="cards/${value}" data-dismiss="modal"
                    data-key="${key}"/>
            </div>
        `);
    }

    $('#pokemonModal')
        .off('click', '.modal-body img')
        .on('click', '.modal-body img', function() {
            let position = $(this).parent().index() - 1;
            sendGameMessage(
                playerId,
                'judge',
                'moveSpecific',
                {
                    from: buttonData.from,
                    position: position,
                    to: buttonData.to,
                    reveal: buttonData.reveal
                }
            ).then(function(groups) {
                renderCardGroups(whichPlayer, groups);
            });
        });
};

pokemonModal.revealOpponentCard = function($modal, buttonData) {
    const images = deckImages[getPlayerId('opponent')];
    const imgSrc = images[buttonData.opponentCard]

    $modal.find('.modal-title').html('Card revealed!');
    $modal.find('.modal-body').html(`
        <p>Your opponent revealed the following card:</p>
        <div class="deck-item">
            <img src="cards/${imgSrc}" />
        </div>
    `);
    $modal.find('.modal-footer').html(`
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Dismiss</button>
    `);
}

pokemonModal.pokemonDetails = function($modal, buttonData) {
    $('.pokemon-card, #pokemonModal .deck-item img.hover').each(function() {
        $(this).removeClass('hover');
        clearTimeout(hoverTimeout);
    });

    $modal.find('.modal-title').html('Pokemon Details');
    $modal.find('.modal-body').html(`
        <p>Details for: ${buttonData.group}</p>
        <div class="cards"></div>
    `);
    $modal.find('.modal-footer').html(`
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Dismiss</button>
    `);

    const whichPlayer = buttonData.player;
    const groupData = gameState[getPlayerId(whichPlayer)][buttonData.group] ?? {
        cards: []
    };
    for (let key in groupData.cards) {
        let cardIdx = groupData.cards[key];
        let img = deckImages[getPlayerId(whichPlayer)][cardIdx];

        $modal.find('.modal-body .cards').append(`
            <div class="deck-item">
                <img src="cards/${img}" />
            </div>
        `);
    }
}
