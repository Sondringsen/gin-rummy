from collections import Counter
from dataclasses import dataclass, field
from typing import Literal, List, Dict, Tuple, Optional
import random
import uuid


ROUND_REQUIREMENTS: Dict[int, Tuple[int, int]] = {
    1: (2, 0),
    2: (1, 1),
    3: (0, 2),
    4: (3, 0),
    5: (2, 1),
    6: (1, 2),
}


@dataclass(frozen=True)
class Card:
    suit: Literal['S', 'H', 'D', 'C']
    value: int  # 2-14, where 14 = Ace, 11=J, 12=Q, 13=K
    card_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8], compare=False, hash=False)
    assigned_value: Optional[int] = field(default=None, compare=False, hash=False)

    def __post_init__(self):
        if self.suit not in ('S', 'H', 'D', 'C'):
            raise ValueError(f'suit must be one of "S", "H", "D", "C", got {self.suit!r}')
        if not (2 <= self.value <= 14):
            raise ValueError(f'value must be between 2 and 14 inclusive, got {self.value}')

    @property
    def is_wild(self) -> bool:
        return self.suit == 'S' and self.value == 2

    @property
    def score(self) -> int:
        if self.is_wild:
            return 50
        if self.value == 14:
            return 20
        if self.value >= 10:
            return 10
        return self.value

    def __repr__(self) -> str:
        names = {11: 'J', 12: 'Q', 13: 'K', 14: 'A'}
        return f'{self.suit}{names.get(self.value, self.value)}'

    def to_dict(self) -> dict:
        d: dict = {'suit': self.suit, 'value': self.value, 'id': self.card_id}
        if self.assigned_value is not None:
            d['assigned_value'] = self.assigned_value
        return d


class Deck:
    suits = ['S', 'H', 'D', 'C']
    values = range(2, 15)

    def __init__(self):
        self.cards: List[Card] = [
            Card(suit, val)
            for suit in self.suits
            for val in self.values
        ]

    def __repr__(self) -> str:
        return ', '.join(str(c) for c in self.cards)


def _is_valid_tress(cards: List[Card]) -> bool:
    """Three or more cards of the same value (wilds count as any value)."""
    if len(cards) < 3:
        return False
    wilds = [c for c in cards if c.is_wild]
    non_wilds = [c for c in cards if not c.is_wild]
    if not non_wilds:
        # All wilds — they all share value 2, which counts as a tress of 2s
        return True
    target_value = non_wilds[0].value
    return all(c.value == target_value for c in non_wilds)


def _is_valid_flush(cards: List[Card]) -> bool:
    """Four or more consecutive cards in the same suit (wilds fill gaps; aces can be 1 or 14).

    Wildcards with assigned_value are treated as positioned cards at that value.
    Wildcards without assigned_value may fill any gap.
    """
    if len(cards) < 4:
        return False

    # Positioned = regular cards + wilds that have an assigned_value
    # Unpositioned = wilds with no assigned_value (free gap-fillers)
    unpositioned_wilds = [c for c in cards if c.is_wild and c.assigned_value is None]
    positioned = [c for c in cards if not c.is_wild or c.assigned_value is not None]
    n_free_wilds = len(unpositioned_wilds)

    if not positioned:
        return True  # all unpositioned wilds

    non_wild_positioned = [c for c in positioned if not c.is_wild]
    if not non_wild_positioned:
        # Only positioned wilds — no suit constraint, just check run
        positioned_values = [c.assigned_value for c in positioned]  # type: ignore[misc]
        return _try_run(positioned_values, n_free_wilds)  # type: ignore[arg-type]

    target_suit = non_wild_positioned[0].suit
    if not all(c.suit == target_suit for c in non_wild_positioned):
        return False

    positioned_values = [
        c.assigned_value if (c.is_wild and c.assigned_value is not None) else c.value
        for c in positioned
    ]

    if _try_run(positioned_values, n_free_wilds):
        return True
    if 14 in positioned_values:
        alt_values = [1 if v == 14 else v for v in positioned_values]
        return _try_run(alt_values, n_free_wilds)
    return False


def _try_run(values: List[int], n_wilds: int) -> bool:
    sorted_vals = sorted(set(values))
    if len(sorted_vals) != len(values):
        return False  # duplicates not allowed in a flush
    if len(sorted_vals) == 1:
        # All same value — wilds fill rest; need total >= 4
        return len(values) + n_wilds >= 4
    span = sorted_vals[-1] - sorted_vals[0] + 1
    gaps = span - len(sorted_vals)
    return gaps <= n_wilds


class GinRummy:
    def __init__(self, n_players: int = 2):
        self.n_players: int = n_players
        self.round: int = 0  # 0 = not started; 1-6 = active rounds
        self.scores: List[int] = [0] * n_players
        self.game_over: bool = False

        # Per-round state (populated by new_round)
        self.fresh_cards: List[Card] = []
        self.discarded_cards: List[Card] = []
        self.player_turn: int = 0
        self.player_cards: List[List[Card]] = []
        self.open_cards: List[Dict[str, List[List[Card]]]] = []
        self.has_opened: List[bool] = []
        self.has_drawn: bool = False
        self.can_draw_from_discarded: bool = False
        self.pre_round_phase: bool = False  # True while players do initial discard
        self._initial_discards_done: int = 0
        self.round_over: bool = False

    # ------------------------------------------------------------------
    # Round lifecycle
    # ------------------------------------------------------------------

    def new_round(self):
        """Shuffle two decks, deal 12 cards each, enter pre-round discard phase."""
        if self.game_over:
            raise ValueError('Game is already over.')

        self.round += 1
        if self.round > 6:
            self.game_over = True
            return

        all_cards: List[Card] = []
        all_cards.extend(Deck().cards)
        all_cards.extend(Deck().cards)
        random.shuffle(all_cards)
        self.fresh_cards = list(all_cards)

        self.discarded_cards = []
        self.player_turn = (self.round - 1) % self.n_players
        self.has_drawn = False
        self.can_draw_from_discarded = False
        self.round_over = False
        self._initial_discards_done = 0

        self.player_cards = []
        self.open_cards = []
        self.has_opened = [False] * self.n_players

        for _ in range(self.n_players):
            sampled_indices = random.sample(range(len(self.fresh_cards)), 12)
            hand = [self.fresh_cards[i] for i in sampled_indices]
            for i in sorted(sampled_indices, reverse=True):
                del self.fresh_cards[i]
            self.player_cards.append(hand)
            self.open_cards.append({'tress': [], 'flush': []})

        self.pre_round_phase = True

    def initial_discard(self, player_num: int, card: dict):
        """Each player discards one of their 12 cards before the round begins."""
        if not self.pre_round_phase:
            raise ValueError('Not in pre-round discard phase.')
        c = Card(card['suit'], card['value'])
        hand = self.player_cards[player_num]
        if c not in hand:
            raise ValueError(f'Player {player_num} does not have card {c}.')
        hand.remove(c)
        # These discards are NOT added to the draw pile (per rules)
        self._initial_discards_done += 1
        if self._initial_discards_done == self.n_players:
            self.pre_round_phase = False

    # ------------------------------------------------------------------
    # Drawing
    # ------------------------------------------------------------------

    def draw_from_deck(self):
        """Current player draws a random card from the fresh deck."""
        if self.pre_round_phase:
            raise ValueError('Still in pre-round phase.')
        if self.has_drawn:
            raise ValueError('Player has already drawn this turn.')
        if not self.fresh_cards:
            if len(self.discarded_cards) <= 1:
                raise ValueError('No cards left to draw.')
            # Keep the top discard in place; reshuffle the rest into the fresh deck
            top_discard = self.discarded_cards[-1]
            self.fresh_cards = self.discarded_cards[:-1]
            random.shuffle(self.fresh_cards)
            self.discarded_cards = [top_discard]
        idx = random.randrange(len(self.fresh_cards))
        drawn = self.fresh_cards.pop(idx)
        self.player_cards[self.player_turn].append(drawn)
        self.has_drawn = True
        return drawn

    def draw_from_discard(self, player_num: int):
        """
        Draw top card from discard pile.
        If out of turn, also draw a penalty card from the fresh deck.
        Returns the drawn card (from discard pile).
        """
        if self.pre_round_phase:
            raise ValueError('Still in pre-round phase.')
        if not self.can_draw_from_discarded:
            raise ValueError('Cannot draw from discard pile right now.')
        if not self.discarded_cards:
            raise ValueError('Discard pile is empty.')

        top_card = self.discarded_cards[-1]

        if player_num != self.player_turn:
            # Out-of-turn draw: penalty card from deck
            if self.fresh_cards:
                idx = random.randrange(len(self.fresh_cards))
                penalty = self.fresh_cards.pop(idx)
                self.player_cards[player_num].append(penalty)
        else:
            self.has_drawn = True

        self.discarded_cards.pop()
        self.player_cards[player_num].append(top_card)
        self.can_draw_from_discarded = False
        return top_card

    # ------------------------------------------------------------------
    # Discarding
    # ------------------------------------------------------------------

    def discard_card(self, card: dict):
        """Current player discards a card, ending their turn."""
        if self.pre_round_phase:
            raise ValueError('Still in pre-round phase.')
        if not self.has_drawn:
            raise ValueError('Must draw before discarding.')
        c = Card(card['suit'], card['value'])
        hand = self.player_cards[self.player_turn]
        if c not in hand:
            raise ValueError(f'Player {self.player_turn} does not have card {c}.')
        hand.remove(c)
        self.discarded_cards.append(c)
        self.has_drawn = False
        self.can_draw_from_discarded = True
        self._advance_turn()
        self._check_round_over()

    def reorder_cards(self, player_num: int, card_order: List[int]) -> None:
        hand = self.player_cards[player_num]
        if sorted(card_order) != list(range(len(hand))):
            raise ValueError(f'card_order must be a permutation of 0..{len(hand)-1}')
        self.player_cards[player_num] = [hand[i] for i in card_order]

    def _advance_turn(self):
        self.player_turn = (self.player_turn + 1) % self.n_players

    # ------------------------------------------------------------------
    # Opening
    # ------------------------------------------------------------------

    def validate_open(self, tress_groups: List[List[dict]], flush_groups: List[List[dict]]) -> bool:
        """Check whether the submitted groups satisfy the round requirements."""
        req_tress, req_flush = ROUND_REQUIREMENTS[self.round]
        if len(tress_groups) < req_tress or len(flush_groups) < req_flush:
            return False
        for group in tress_groups:
            if not _is_valid_tress([Card(c['suit'], c['value']) for c in group]):
                return False
        for group in flush_groups:
            if not _is_valid_flush([Card(c['suit'], c['value'], assigned_value=c.get('assigned_value')) for c in group]):
                return False
        # All cards in groups must be in the player's hand (accounting for duplicates)
        submitted: List[Card] = []
        for g in tress_groups:
            submitted.extend(Card(c['suit'], c['value']) for c in g)
        for g in flush_groups:
            submitted.extend(Card(c['suit'], c['value']) for c in g)
        hand_counts = Counter(self.player_cards[self.player_turn])
        for card, count in Counter(submitted).items():
            if hand_counts[card] < count:
                return False
        # Round 6: must use ALL cards (no leftovers after discard is removed)
        if self.round == 6:
            if len(submitted) != len(self.player_cards[self.player_turn]):
                return False
        return True

    def open_hand(self, tress_groups: List[List[dict]], flush_groups: List[List[dict]]):
        """Current player opens with the given tress/flush groups."""
        if self.pre_round_phase:
            raise ValueError('Still in pre-round phase.')
        if not self.has_drawn:
            raise ValueError('Must draw before opening.')
        if self.has_opened[self.player_turn]:
            raise ValueError(f'Player {self.player_turn} has already opened.')
        if not self.validate_open(tress_groups, flush_groups):
            raise ValueError('Invalid open: groups do not satisfy round requirements.')

        t_cards = [[Card(c['suit'], c['value']) for c in g] for g in tress_groups]
        f_cards = [[Card(c['suit'], c['value'], assigned_value=c.get('assigned_value')) for c in g] for g in flush_groups]

        hand = self.player_cards[self.player_turn]
        for group in t_cards + f_cards:
            for c in group:
                hand.remove(c)

        self.open_cards[self.player_turn]['tress'] = t_cards
        self.open_cards[self.player_turn]['flush'] = f_cards
        self.has_opened[self.player_turn] = True

        # Round 6: opening uses all cards — round ends immediately
        if self.round == 6:
            self._end_round()
        else:
            self._check_round_over()

    # ------------------------------------------------------------------
    # Building on opened cards
    # ------------------------------------------------------------------

    def build_on(self, player_num: int, target_player: int, group_type: Literal['tress', 'flush'], group_index: int, cards: List[dict]):
        """
        An opened player adds cards to another (or their own) opened group.
        Must be called during the player's turn (after drawing, before discarding).
        """
        if not self.has_opened[player_num]:
            raise ValueError(f'Player {player_num} has not opened yet.')
        if not self.has_opened[target_player]:
            raise ValueError(f'Player {target_player} has not opened yet.')
        if player_num != self.player_turn:
            raise ValueError('Can only build on your own turn.')
        if not self.has_drawn:
            raise ValueError('Must draw before building.')

        groups = self.open_cards[target_player][group_type]
        if group_index < 0 or group_index >= len(groups):
            raise ValueError(f'Invalid group index {group_index}.')

        new_cards = [Card(c['suit'], c['value'], assigned_value=c.get('assigned_value') if group_type == 'flush' else None) for c in cards]
        hand = self.player_cards[player_num]
        hand_counts = Counter(hand)
        for card, count in Counter(new_cards).items():
            if hand_counts[card] < count:
                raise ValueError(f'Player {player_num} does not have {count}x {card}.')

        target_group = list(groups[group_index]) + new_cards
        validator = _is_valid_tress if group_type == 'tress' else _is_valid_flush
        if not validator(target_group):
            raise ValueError(f'Adding cards does not produce a valid {group_type}.')

        groups[group_index] = target_group
        for c in new_cards:
            hand.remove(c)

        self._check_round_over()

    def replace_wild_in_build(self, player_num: int, target_player: int, group_type: Literal['tress', 'flush'], group_index: int, card: dict):
        """
        Replace a wild (2♠) in an opened group with the actual card it represents.
        The wild is returned to the player's hand.
        """
        if not self.has_opened[player_num]:
            raise ValueError(f'Player {player_num} has not opened yet.')
        if not self.has_opened[target_player]:
            raise ValueError(f'Player {target_player} has not opened yet.')
        if player_num != self.player_turn:
            raise ValueError('Can only replace wild on your own turn.')
        if not self.has_drawn:
            raise ValueError('Must draw before replacing wild.')

        groups = self.open_cards[target_player][group_type]
        if group_index < 0 or group_index >= len(groups):
            raise ValueError(f'Invalid group index {group_index}.')

        group = list(groups[group_index])
        wild = Card('S', 2)
        if wild not in group:
            raise ValueError('No wild card in that group.')

        replacement = Card(card['suit'], card['value'])
        hand = self.player_cards[player_num]
        if replacement not in hand:
            raise ValueError(f'Player {player_num} does not have {replacement}.')

        idx = group.index(wild)
        new_group = group[:idx] + [replacement] + group[idx + 1:]
        validator = _is_valid_tress if group_type == 'tress' else _is_valid_flush
        if not validator(new_group):
            raise ValueError(f'Replacing wild does not produce a valid {group_type}.')

        groups[group_index] = new_group
        hand.remove(replacement)
        hand.append(wild)

    # ------------------------------------------------------------------
    # Round / game end
    # ------------------------------------------------------------------

    def _check_round_over(self):
        for hand in self.player_cards:
            if len(hand) == 0:
                self._end_round()
                return

    def _end_round(self):
        self.count_score()
        self.round_over = True
        if self.round >= 6:
            self.game_over = True

    def count_score(self):
        for i, hand in enumerate(self.player_cards):
            self.scores[i] += sum(c.score for c in hand)

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def get_state(self, perspective_player: int) -> dict:
        """Return a JSON-serializable snapshot of the game state."""
        players = []
        for i in range(self.n_players):
            if i == perspective_player:
                cards = [c.to_dict() for c in self.player_cards[i]]
            else:
                cards = None  # hidden
            open_tress = [[c.to_dict() for c in g] for g in self.open_cards[i]['tress']]
            open_flush = [[c.to_dict() for c in g] for g in self.open_cards[i]['flush']]
            players.append({
                'player_num': i,
                'card_count': len(self.player_cards[i]),
                'cards': cards,
                'open_tress': open_tress,
                'open_flush': open_flush,
                'has_opened': self.has_opened[i],
                'score': self.scores[i],
            })

        discard_top = self.discarded_cards[-1].to_dict() if self.discarded_cards else None

        return {
            'round': self.round,
            'player_turn': self.player_turn,
            'perspective_player': perspective_player,
            'pre_round_phase': self.pre_round_phase,
            'can_draw_from_discarded': self.can_draw_from_discarded,
            'has_drawn': self.has_drawn,
            'discard_top': discard_top,
            'fresh_deck_count': len(self.fresh_cards),
            'players': players,
            'game_over': self.game_over,
            'round_over': self.round_over,
            'scores': list(self.scores),
            'n_players': self.n_players,
            'round_requirements': {
                'tress': ROUND_REQUIREMENTS.get(self.round, (0, 0))[0],
                'flush': ROUND_REQUIREMENTS.get(self.round, (0, 0))[1],
            },
        }


if __name__ == '__main__':
    game = GinRummy(n_players=2)
    game.new_round()
    print(f'Round {game.round}')
    print(f'Player 0 hand ({len(game.player_cards[0])} cards): {game.player_cards[0]}')
    print(f'Player 1 hand ({len(game.player_cards[1])} cards): {game.player_cards[1]}')
    print(f'Fresh deck: {len(game.fresh_cards)} cards')
