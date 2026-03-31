# Gin Rummy App
This app implements a card game called Gin Rummy. I am not sure the rules we usually play with are the commonly accepted rules found online so here is an overview of the rules and the flow of the game.

## Definitions
- A 'tress' is defined as having three or more cards of the same value, i.e. three 4s.
- A 'flush' is defined as having four or more consecutive cards in the same colour, i.e. 4 of spades through 7 of spades.

## How the Game is Played
The game is played with two decks of cards. The game consist of six rounds and the deck is shuffled between each round. The overall objective is to have as few points as possible after all 6 rounds. 

A player starts each round with 12 cards (the other people cannot see your cards). Of the 12 cards a player is dealt in the beginning the player can discard one of them before the round begins. Each player therefore effectively starts with 11 cards. Within each round each player tries to get rid of the cards on their hand. A player starts their turn by drawing either a card from the top of the fresh deck of cards or from the top of the discarded cards. A player can only draw from the discarded cards if it is the most recent card to have been discarded (this is only relevant when a player draws out of turn). The player can then choose to either discard a card (the discarded cards are visible to everyone) or open. A player can open if it meets the following requirements.

- Round 1: two tress'
- Round 2: one tress one flush
- Round 3: two flushes
- Round 4: three tress'
- Round 5: two tress' one flush
- Round 6: one tress two flushes

The opened tress' and flushes are visible to all players. If multiple players have opened they can build on other players opened cards before discarding a card to get rid of more cards. A player who has not yet opened cannot do this. The round is over when one player get rid of all their cards. 

The winner is the one with the lowest score after all rounds are played.

### Counting Score
The score is calculated as follows:
- Two of spades are worth 50 points.
- Aces are worth 20 points.
- Picture cards are worth 10 points.
- Other cards are worht their face value.

# Other rules
- Two of spades can be used as any card (essentially a joker).
- Aces can be used as both 1 and 14.
- A player can draw the top card from the discarded deck of cards out of turn. This is penalized by having to draw a card from the deck of fresh cards.
- In the final round a player most open with all the cards (no card can be discarded). This means that in the final round only one player is going to open.
- You cannot draw from the cards that are discarded as the first i.e. when the players discard one of their 12 cards before the round begins.
