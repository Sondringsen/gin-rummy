from dataclasses import dataclass
from typing import Literal, List, Dict
import numpy as np

@dataclass(frozen=True)
class Card:
    suit: Literal['S', 'H', 'D', 'C']
    value: int

    def _validate(self):
        if self.suit not in ['S', 'H', 'D', 'C']: 
            raise ValueError('suit must be one of "S", "H", "D", "C"')
        elif self.value <= 14 and self.value >= 2:
            raise ValueError('Value must be between 2 and 14 (inclusive)')

    def __post_init(self):
        self._validate()

    def __repr__(self):
        return f'{self.suit}{self.value}'


class Deck:
    suits = ['S', 'H', 'D', 'C']
    values = range(2, 15)

    def __init__(self):
        self.cards: List[Card] = []
        for suit in self.suits:
            for val in self.values:
                self.cards.append(Card(suit, val))

    def to_card_list(self):
        return self.cards
    
    def __repr__(self):
        return ', '.join(str(card) for card in self.cards)
    
    

class GinRummy:
    fresh_cards: List[Card]
    discarded_cards: List[Card]
    n_players: int
    player_turn: int
    player_cards: List[List[Card]]
    open_cards: List[Dict[List[Card]]]
    can_draw_from_discarded: bool
    round: int
    scores: List[int]
    game_over: bool

    def __init__(self, n_players: int = 2):
        # Start with two decks
        self.n_players = n_players
        self.round = 1
        self.scores = [0 for _ in range(n_players)]
        

    def new_round(self):
        # Deals cards to players and resets state variables before each round starts
        self.fresh_cards = []
        self.fresh_cards.extend(Deck().to_card_list())
        self.fresh_cards.extend(Deck().to_card_list())

        self.discarded_cards = []
        self.player_turn = 0

        self.player_cards = []
        self.open_cards = []
        for _ in range(self.n_players):
            player_i_cards = np.random.choice(self.fresh_cards, 12, replace=False)
            self.player_cards.append(player_i_cards)
            for drawn_card in player_i_cards:
                self.fresh_cards.remove(drawn_card)
            self.open_cards.append({'tress': [], 'flush': []})

        self.round += 1
        self.can_draw_from_discarded = False
        self.game_over = False


    def draw_card(self):
        # The player whose turn it is draws a card from the top of the deck.
        # The deck is sorted so we need a random draw
        drawn_card = np.random.choice(self.fresh_cards, 1)
        self.player_cards[self.player_turn].append(drawn_card)
        self.fresh_cards = self.fresh_cards.remove(drawn_card)

    def draw_discarded_card(self, player_num: int):
        # Draw extra card if out of turn
        if player_num != self.player_turn:
            extra_card = np.random.choice(self.fresh_cards, 1)
            self.player_cards[player_num].append(extra_card)
            self.fresh_cards = self.fresh_cards.remove(extra_card)
            self.can_draw_from_discarded = False

        # Draw the top card from the discarded deck
        self.player_cards[player_num].append(self.discarded_cards[-1])
        self.discarded_cards = self.discarded_cards[:-1]


    def discard_card(self, card):
        if card not in self.player_cards[self.player_turn]:
            raise ValueError(f'Player {self.player_turn} does not have the card {card}.')
        self.player_cards[self.player_turn].remove(card)
        self.discarded_cards.append(card)
        if self.player_turn == self.n_players - 1:
            self.player_turn = 0
        else:
            self.player_turn += 1
        self.can_draw_from_discarded = True


    def open(self, tress: List[Card], flush: List[Card]):
        if self.can_open():
            self.open_cards[self.player_turn]['tress'] = tress
            self.open_cards[self.player_turn]['flush'] = flush
        else:
            raise ValueError(f'Player {self.player_turn} cannot open yet.')


    def get_card_score(self, card: Card):
        if card.value == 14: 
            return 20
        elif card.value == 2 and card.suit == 'S':
            return 50
        elif card.value >= 10 and card.value < 14:
            return 10
        else: 
            return card.value


    def can_open(self) -> bool:
        pass
    
    def check_round_over(self) -> bool: 
        # Checks if a round is over.
        for remaining_player_cards in self.player_cards:
            if len(remaining_player_cards) == 0:
                return True
        return False

    def count_score(self):
        # Counts the score of the players after a round is over.
        for i in range(self.n_players):
            for card in self.player_cards[i]:
                self.scores[i] += self.get_card_score(card)


    def _count_tress(self, cards: List[Card]) -> int:
        # Returns the number of tress' given a list of cards
        pass

    def _count_flush(self, cards: List[Card]) -> int:
        # Returns the number of flushes given a list of cards
        pass

    def can_open(self) -> bool:
        # Check if the player can open given a round
        cards = self.player_cards[self.player_turn]
        if self.round == 1:
            pass



if __name__ == '__main__':
    # card = Card('C', 14)
    # print(card)
    # deck = Deck()
    # print(deck)
    game = GinRummy()
    print(game.fresh_cards)
    print(len(game.fresh_cards))
    print(game.discarded_cards)
    print(game.player_cards)
