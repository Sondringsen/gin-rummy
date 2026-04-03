"""Tests for gin_rummy.py game logic."""
import pytest
from gin_rummy import Card, GinRummy, _is_valid_flush, _is_valid_tress


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def c(suit: str, value: int, assigned_value: int | None = None) -> Card:
    """Shorthand card constructor."""
    return Card(suit, value, assigned_value=assigned_value)


def wild(assigned_value: int | None = None) -> Card:
    return Card('S', 2, assigned_value=assigned_value)


def cd(suit: str, value: int, assigned_value: int | None = None) -> dict:
    """Card as dict (as the frontend sends it)."""
    d: dict = {'suit': suit, 'value': value}
    if assigned_value is not None:
        d['assigned_value'] = assigned_value
    return d


def wd(assigned_value: int | None = None) -> dict:
    d: dict = {'suit': 'S', 'value': 2}
    if assigned_value is not None:
        d['assigned_value'] = assigned_value
    return d


def start_round(n_players: int = 2) -> GinRummy:
    """Start a fresh game at round 1 and complete the pre-round discard phase."""
    game = GinRummy(n_players=n_players)
    game.new_round()
    for i in range(n_players):
        game.initial_discard(i, game.player_cards[i][0].to_dict())
    return game


def give_hand(game: GinRummy, player: int, cards: list[Card]) -> None:
    """Replace a player's hand with the given cards."""
    game.player_cards[player] = list(cards)


def do_draw(game: GinRummy) -> None:
    """Draw a card for whoever's turn it is."""
    game.draw_from_deck()


# ---------------------------------------------------------------------------
# _is_valid_tress
# ---------------------------------------------------------------------------

class TestIsValidTress:
    def test_basic_three_of_a_kind(self):
        assert _is_valid_tress([c('H', 7), c('D', 7), c('C', 7)])

    def test_four_of_a_kind(self):
        assert _is_valid_tress([c('H', 7), c('D', 7), c('C', 7), c('S', 7)])

    def test_too_few_cards(self):
        assert not _is_valid_tress([c('H', 7), c('D', 7)])

    def test_mixed_values_invalid(self):
        assert not _is_valid_tress([c('H', 7), c('D', 7), c('C', 8)])

    def test_wild_fills_tress(self):
        assert _is_valid_tress([c('H', 7), c('D', 7), wild()])

    def test_wild_with_two_different_values_invalid(self):
        # wild can't make 7 and 8 a tress
        assert not _is_valid_tress([c('H', 7), c('D', 8), wild()])

    def test_all_wilds(self):
        # Three 2♠ is a valid tress of 2s
        assert _is_valid_tress([wild(), wild(), wild()])

    def test_two_wilds_one_real(self):
        assert _is_valid_tress([wild(), wild(), c('H', 9)])

    def test_aces(self):
        assert _is_valid_tress([c('H', 14), c('D', 14), c('C', 14)])


# ---------------------------------------------------------------------------
# _is_valid_flush
# ---------------------------------------------------------------------------

class TestIsValidFlush:
    def test_basic_four_consecutive(self):
        assert _is_valid_flush([c('H', 5), c('H', 6), c('H', 7), c('H', 8)])

    def test_five_consecutive(self):
        assert _is_valid_flush([c('H', 3), c('H', 4), c('H', 5), c('H', 6), c('H', 7)])

    def test_too_few_cards(self):
        assert not _is_valid_flush([c('H', 5), c('H', 6), c('H', 7)])

    def test_mixed_suits_invalid(self):
        assert not _is_valid_flush([c('H', 5), c('H', 6), c('D', 7), c('H', 8)])

    def test_gap_with_no_wild_invalid(self):
        assert not _is_valid_flush([c('H', 5), c('H', 6), c('H', 8), c('H', 9)])

    # Unpositioned wild (no assigned_value) fills gaps freely
    def test_unpositioned_wild_fills_gap(self):
        assert _is_valid_flush([c('H', 5), c('H', 6), c('H', 8), wild()])

    def test_unpositioned_wild_extends_run(self):
        assert _is_valid_flush([c('H', 5), c('H', 6), c('H', 7), wild()])

    def test_two_unpositioned_wilds_fill_two_gaps(self):
        assert _is_valid_flush([c('H', 5), c('H', 8), wild(), wild()])

    # Positioned wild (assigned_value set) is fixed in place
    def test_positioned_wild_at_correct_gap(self):
        # 8-9-wild(10)-J
        assert _is_valid_flush([c('H', 8), c('H', 9), wild(assigned_value=10), c('H', 11)])

    def test_positioned_wild_at_extension(self):
        # wild(7)-8-9-10
        assert _is_valid_flush([wild(assigned_value=7), c('H', 8), c('H', 9), c('H', 10)])

    def test_positioned_wild_wrong_value_invalid(self):
        # 8-9-J-wild assigned Q: gap at 10 not filled → invalid
        assert not _is_valid_flush([c('H', 8), c('H', 9), c('H', 11), wild(assigned_value=12)])

    def test_positioned_wild_as_queen_not_filling_ten_gap(self):
        # The exact bug: 8-9-J + wild assigned Q should be INVALID
        assert not _is_valid_flush([c('H', 8), c('H', 9), c('H', 11), wild(assigned_value=12)])

    def test_wild_cannot_bridge_two_card_gap(self):
        # 5-6-9-10: gap of 2 (7 and 8) but only one wild
        assert not _is_valid_flush([c('H', 5), c('H', 6), c('H', 9), c('H', 10), wild()])

    # Ace high and ace low
    def test_ace_high(self):
        assert _is_valid_flush([c('H', 11), c('H', 12), c('H', 13), c('H', 14)])

    def test_ace_low(self):
        # A-2-3-4 (ace as 1)
        assert _is_valid_flush([c('H', 14), c('H', 2), c('H', 3), c('H', 4)])

    def test_ace_low_with_wild(self):
        assert _is_valid_flush([c('H', 14), c('H', 3), c('H', 4), wild()])

    def test_all_wilds_four(self):
        assert _is_valid_flush([wild(), wild(), wild(), wild()])

    def test_positioned_wild_first_card_in_flush(self):
        # wild assigned as 2 then H2, H4, HA — should be INVALID (not a consecutive run)
        assert not _is_valid_flush([wild(assigned_value=2), c('H', 2), c('H', 4), c('H', 14)])


# ---------------------------------------------------------------------------
# Deck uniqueness: no card object appears in two places
# ---------------------------------------------------------------------------

class TestDeckUniqueness:
    def test_no_shared_objects_after_deal(self):
        """Each card object must appear exactly once across all hands + fresh deck."""
        game = GinRummy(n_players=4)
        game.new_round()
        all_cards = list(game.fresh_cards)
        for hand in game.player_cards:
            all_cards.extend(hand)
        ids = [id(card) for card in all_cards]
        assert len(ids) == len(set(ids)), "Duplicate card objects found after deal"

    def test_no_shared_objects_after_draw(self):
        game = start_round(2)
        hand_size_before = len(game.player_cards[0])
        game.draw_from_deck()
        hand_size_after = len(game.player_cards[0])
        assert hand_size_after == hand_size_before + 1

        all_cards = list(game.fresh_cards)
        for hand in game.player_cards:
            all_cards.extend(hand)
        ids = [id(card) for card in all_cards]
        assert len(ids) == len(set(ids)), "Duplicate card objects found after draw"

    def test_total_card_count_preserved(self):
        game = GinRummy(n_players=2)
        game.new_round()
        # 2 decks = 104 cards total; 2 players × 12 dealt = 24; remainder in fresh deck
        total = len(game.fresh_cards) + sum(len(h) for h in game.player_cards)
        assert total == 104

    def test_total_count_preserved_after_initial_discard(self):
        game = GinRummy(n_players=2)
        game.new_round()
        for i in range(2):
            game.initial_discard(i, game.player_cards[i][0].to_dict())
        # 2 cards discarded (not added to draw pile per rules)
        total = len(game.fresh_cards) + sum(len(h) for h in game.player_cards)
        assert total == 102


# ---------------------------------------------------------------------------
# Deck reshuffle when empty
# ---------------------------------------------------------------------------

class TestDeckReshuffle:
    def test_reshuffle_when_deck_empty(self):
        game = start_round(2)
        # Empty the fresh deck manually
        game.fresh_cards = []
        # Populate discard pile with several cards
        game.discarded_cards = [c('H', 5), c('H', 6), c('H', 7), c('H', 8)]
        game.can_draw_from_discarded = False  # force draw-from-deck path

        drawn = game.draw_from_deck()
        # Top discard (H8) must remain as the only discard card
        assert len(game.discarded_cards) == 1
        assert game.discarded_cards[0] == c('H', 8)
        # The drawn card must have been one of the reshuffled cards
        assert drawn in [c('H', 5), c('H', 6), c('H', 7)]
        # Fresh deck now has 2 of the 3 reshuffled cards (one was drawn)
        assert len(game.fresh_cards) == 2

    def test_reshuffle_raises_when_only_one_discard(self):
        game = start_round(2)
        game.fresh_cards = []
        game.discarded_cards = [c('H', 5)]
        with pytest.raises(ValueError, match='No cards left'):
            game.draw_from_deck()

    def test_reshuffle_raises_when_discard_empty(self):
        game = start_round(2)
        game.fresh_cards = []
        game.discarded_cards = []
        with pytest.raises(ValueError, match='No cards left'):
            game.draw_from_deck()


# ---------------------------------------------------------------------------
# Opening
# ---------------------------------------------------------------------------

class TestOpenHand:
    def _setup_round1(self) -> GinRummy:
        game = start_round(2)
        game.has_drawn = True  # simulate having drawn
        return game

    def test_valid_open_two_tresses_round1(self):
        game = self._setup_round1()
        give_hand(game, 0, [
            c('H', 7), c('D', 7), c('C', 7),
            c('H', 9), c('D', 9), c('C', 9),
            c('H', 3),
        ])
        tress = [[cd('H', 7), cd('D', 7), cd('C', 7)], [cd('H', 9), cd('D', 9), cd('C', 9)]]
        game.open_hand(tress, [])
        assert game.has_opened[0]

    def test_invalid_open_wrong_round_requirement(self):
        game = self._setup_round1()
        give_hand(game, 0, [
            c('H', 5), c('H', 6), c('H', 7), c('H', 8),  # a flush
            c('H', 9), c('D', 9), c('C', 9),
        ])
        # Round 1 requires two tresses, not a flush
        with pytest.raises(ValueError, match='Invalid open'):
            game.open_hand([], [[cd('H', 5), cd('H', 6), cd('H', 7), cd('H', 8)]])

    def test_open_requires_drawing_first(self):
        game = start_round(2)
        # has_drawn is False
        give_hand(game, 0, [c('H', 7), c('D', 7), c('C', 7), c('H', 9), c('D', 9), c('C', 9)])
        with pytest.raises(ValueError, match='Must draw before opening'):
            game.open_hand(
                [[cd('H', 7), cd('D', 7), cd('C', 7)], [cd('H', 9), cd('D', 9), cd('C', 9)]],
                [],
            )

    def test_cannot_open_twice(self):
        game = self._setup_round1()
        give_hand(game, 0, [
            c('H', 7), c('D', 7), c('C', 7),
            c('H', 9), c('D', 9), c('C', 9),
        ])
        tress = [[cd('H', 7), cd('D', 7), cd('C', 7)], [cd('H', 9), cd('D', 9), cd('C', 9)]]
        game.open_hand(tress, [])
        # Cards removed; player can't open again
        game.has_drawn = True
        with pytest.raises(ValueError, match='already opened'):
            game.open_hand([], [])

    def test_cards_not_in_hand_rejected(self):
        game = self._setup_round1()
        give_hand(game, 0, [c('H', 7), c('D', 7), c('C', 7), c('H', 9), c('D', 9), c('C', 9)])
        # Try to open with a card the player doesn't have
        tress = [[cd('H', 7), cd('D', 7), cd('S', 7)], [cd('H', 9), cd('D', 9), cd('C', 9)]]
        with pytest.raises(ValueError, match='Invalid open'):
            game.open_hand(tress, [])


# ---------------------------------------------------------------------------
# Flush validation in validate_open (assigned_value respected)
# ---------------------------------------------------------------------------

class TestFlushValidateOpen:
    def _setup_round3(self) -> GinRummy:
        """Round 3 requires two flushes."""
        game = GinRummy(n_players=2)
        # Fast-forward to round 3
        for _ in range(3):
            game.new_round()
            for i in range(2):
                game.initial_discard(i, game.player_cards[i][0].to_dict())
            if game.round < 3:
                # End rounds 1 and 2 by clearing a hand
                game.player_cards[0] = []
                game._end_round()
        game.has_drawn = True
        return game

    def test_positioned_wild_as_queen_cannot_fill_ten_gap(self):
        """8-9-J♥ + wild assigned Q must be rejected."""
        game = start_round(2)
        game.round = 3
        game.has_drawn = True
        give_hand(game, 0, [
            c('H', 8), c('H', 9), c('H', 11), wild(),
            c('D', 5), c('D', 6), c('D', 7), c('D', 8),
        ])
        flush1 = [cd('H', 8), cd('H', 9), cd('H', 11), wd(assigned_value=12)]
        flush2 = [cd('D', 5), cd('D', 6), cd('D', 7), cd('D', 8)]
        assert not game.validate_open([], [flush1, flush2])

    def test_positioned_wild_filling_correct_gap_accepted(self):
        """8-9-wild(10)-J♥ must be accepted."""
        game = start_round(2)
        game.round = 3
        game.has_drawn = True
        give_hand(game, 0, [
            c('H', 8), c('H', 9), c('H', 11), wild(),
            c('D', 5), c('D', 6), c('D', 7), c('D', 8),
        ])
        flush1 = [cd('H', 8), cd('H', 9), wd(assigned_value=10), cd('H', 11)]
        flush2 = [cd('D', 5), cd('D', 6), cd('D', 7), cd('D', 8)]
        assert game.validate_open([], [flush1, flush2])

    def test_wild_first_with_nonconsecutive_cards_invalid(self):
        """wild(2)-H2-H4-HA is not a valid flush (gaps remain after positioning wild)."""
        assert not _is_valid_flush([
            wild(assigned_value=2), c('H', 2), c('H', 4), c('H', 14),
        ])

    def test_unpositioned_wild_cannot_fix_multiple_gaps(self):
        """H2-H4-HA + unpositioned wild: gaps at 3 and 1(ace-low) can't both be filled."""
        # H2, H4, HA(as 1): sorted would be 1,2,4 — span=4, gaps=1, 1 wild fills it → valid
        # But wait: A as 1 gives [1,2,4]: span=4, 3 values, gap=1 → valid with 1 wild
        # However H2 is the wildcard suit — but here H2 is NOT the wild (wild is S2).
        # So H2, H4, HA with one free wild: ace-low gives [1,2,4] → gap at 3, 1 wild fills it → valid
        assert _is_valid_flush([c('H', 2), c('H', 4), c('H', 14), wild()])

    def test_positioned_wild_does_not_fill_remaining_gap(self):
        """8-10-J + wild assigned 12 (Q): gap at 9 still exists → invalid."""
        assert not _is_valid_flush([c('H', 8), c('H', 10), c('H', 11), wild(assigned_value=12)])


# ---------------------------------------------------------------------------
# Building on open cards
# ---------------------------------------------------------------------------

class TestBuildOn:
    def _open_p0_tress(self) -> GinRummy:
        game = start_round(2)
        game.has_drawn = True
        give_hand(game, 0, [
            c('H', 7), c('D', 7), c('C', 7), c('H', 3),
            c('H', 9), c('D', 9), c('C', 9),
        ])
        game.open_hand(
            [[cd('H', 7), cd('D', 7), cd('C', 7)], [cd('H', 9), cd('D', 9), cd('C', 9)]],
            [],
        )
        return game

    def test_build_adds_to_tress(self):
        game = self._open_p0_tress()
        # Simulate p0's turn again (advance + give card)
        game.player_turn = 0
        game.has_drawn = True
        give_hand(game, 0, [c('S', 7), c('H', 3)])
        game.build_on(0, 0, 'tress', 0, [cd('S', 7)])
        assert len(game.open_cards[0]['tress'][0]) == 4

    def test_build_invalid_card_rejected(self):
        game = self._open_p0_tress()
        game.player_turn = 0
        game.has_dried = True
        game.has_drawn = True
        give_hand(game, 0, [c('H', 8)])
        # 8 does not fit a tress of 7s
        with pytest.raises(ValueError, match='valid tress'):
            game.build_on(0, 0, 'tress', 0, [cd('H', 8)])

    def test_build_requires_player_to_have_opened(self):
        game = start_round(2)
        game.has_drawn = True
        give_hand(game, 0, [c('H', 7), c('D', 7), c('C', 7), c('H', 9), c('D', 9), c('C', 9)])
        # p0 has not opened
        with pytest.raises(ValueError, match='has not opened'):
            game.build_on(0, 0, 'tress', 0, [cd('S', 7)])


# ---------------------------------------------------------------------------
# Replace wild
# ---------------------------------------------------------------------------

class TestReplaceWild:
    def _open_with_wild(self) -> GinRummy:
        game = start_round(2)
        game.has_drawn = True
        give_hand(game, 0, [
            c('H', 7), c('D', 7), wild(),
            c('H', 9), c('D', 9), c('C', 9),
        ])
        game.open_hand(
            [[cd('H', 7), cd('D', 7), wd()], [cd('H', 9), cd('D', 9), cd('C', 9)]],
            [],
        )
        return game

    def test_replace_wild_gives_wild_back(self):
        game = self._open_with_wild()
        game.player_turn = 0
        game.has_drawn = True
        give_hand(game, 0, [c('C', 7)])
        wild_count_before = sum(1 for c_ in game.player_cards[0] if c_.is_wild)
        game.replace_wild_in_build(0, 0, 'tress', 0, cd('C', 7))
        wild_count_after = sum(1 for c_ in game.player_cards[0] if c_.is_wild)
        assert wild_count_after == wild_count_before + 1
        assert not any(c_.is_wild for c_ in game.open_cards[0]['tress'][0])

    def test_replace_wild_wrong_card_rejected(self):
        game = self._open_with_wild()
        game.player_turn = 0
        game.has_drawn = True
        # H8 doesn't fit a tress of 7s
        give_hand(game, 0, [c('H', 8)])
        with pytest.raises(ValueError):
            game.replace_wild_in_build(0, 0, 'tress', 0, cd('H', 8))


# ---------------------------------------------------------------------------
# Draw from discard — out-of-turn penalty
# ---------------------------------------------------------------------------

class TestDrawFromDiscard:
    def test_out_of_turn_draw_gives_penalty(self):
        game = start_round(2)
        game.has_drawn = True
        give_hand(game, 0, [c('H', 3)])
        game.discard_card(cd('H', 3))
        # Now it's p1's turn; p0 draws out of turn
        hand_size_before = len(game.player_cards[0])
        fresh_before = len(game.fresh_cards)
        game.draw_from_discard(0)  # out of turn
        # p0 should have received the discard card + a penalty card
        assert len(game.player_cards[0]) == hand_size_before + 2
        assert len(game.fresh_cards) == fresh_before - 1

    def test_in_turn_draw_from_discard(self):
        game = start_round(2)
        game.has_drawn = True
        give_hand(game, 0, [c('H', 3)])
        game.discard_card(cd('H', 3))
        # p1's turn — draws the discard
        hand_size_before = len(game.player_cards[1])
        game.draw_from_discard(1)
        assert len(game.player_cards[1]) == hand_size_before + 1
        assert game.has_drawn


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

class TestScoring:
    def test_wild_scores_50(self):
        assert wild().score == 50

    def test_ace_scores_20(self):
        assert c('H', 14).score == 20

    def test_picture_cards_score_10(self):
        for v in (10, 11, 12, 13):
            assert c('H', v).score == 10

    def test_number_cards_score_face_value(self):
        for v in range(3, 10):
            assert c('H', v).score == v

    def test_count_score_accumulates(self):
        game = start_round(2)
        give_hand(game, 0, [c('H', 5), c('H', 6)])   # 11 points
        give_hand(game, 1, [c('H', 14), wild()])       # 70 points
        game._end_round()
        assert game.scores[0] == 11
        assert game.scores[1] == 70


# ---------------------------------------------------------------------------
# Round 6 special rules
# ---------------------------------------------------------------------------

class TestRound6:
    def _setup_round6(self) -> GinRummy:
        game = GinRummy(n_players=2)
        game.round = 5  # will become 6 after new_round
        game.scores = [0, 0]
        game.new_round()
        for i in range(2):
            game.initial_discard(i, game.player_cards[i][0].to_dict())
        game.has_drawn = True
        return game

    def test_round6_must_use_all_cards(self):
        game = self._setup_round6()
        assert game.round == 6
        # Give p0 exactly a tress + two flushes (round 6: 1 tress + 2 flushes)
        give_hand(game, 0, [
            c('H', 7), c('D', 7), c('C', 7),            # tress
            c('H', 3), c('H', 4), c('H', 5), c('H', 6), # flush 1
            c('D', 9), c('D', 10), c('D', 11), c('D', 12), # flush 2
        ])
        tress = [[cd('H', 7), cd('D', 7), cd('C', 7)]]
        flush = [
            [cd('H', 3), cd('H', 4), cd('H', 5), cd('H', 6)],
            [cd('D', 9), cd('D', 10), cd('D', 11), cd('D', 12)],
        ]
        game.open_hand(tress, flush)
        assert game.round_over

    def test_round6_leftover_card_rejected(self):
        game = self._setup_round6()
        give_hand(game, 0, [
            c('H', 7), c('D', 7), c('C', 7),
            c('H', 3), c('H', 4), c('H', 5), c('H', 6),
            c('D', 9), c('D', 10), c('D', 11), c('D', 12),
            c('H', 8),  # extra card — not in any group
        ])
        tress = [[cd('H', 7), cd('D', 7), cd('C', 7)]]
        flush = [
            [cd('H', 3), cd('H', 4), cd('H', 5), cd('H', 6)],
            [cd('D', 9), cd('D', 10), cd('D', 11), cd('D', 12)],
        ]
        with pytest.raises(ValueError, match='Invalid open'):
            game.open_hand(tress, flush)

    def test_round6_ends_game(self):
        game = self._setup_round6()
        give_hand(game, 0, [
            c('H', 7), c('D', 7), c('C', 7),
            c('H', 3), c('H', 4), c('H', 5), c('H', 6),
            c('D', 9), c('D', 10), c('D', 11), c('D', 12),
        ])
        game.open_hand(
            [[cd('H', 7), cd('D', 7), cd('C', 7)]],
            [
                [cd('H', 3), cd('H', 4), cd('H', 5), cd('H', 6)],
                [cd('D', 9), cd('D', 10), cd('D', 11), cd('D', 12)],
            ],
        )
        assert game.game_over
