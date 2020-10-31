import shuffle from "lodash.shuffle";
import { Card } from "./Card";

export class Deck {
  private cards: Card[] = [];

  constructor(cards: Card[]) {
    this.cards = [...cards];
  }

  shuffle() {
    this.cards = shuffle(this.cards);

    return this;
  }

  split(parts = 2): Deck[] {
    const newDecksCards: Card[][] = new Array(parts).fill(null).map(() => []);

    // Distribute cards between all the card arrays
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];

      const deckCardsIndex = i % parts;
      newDecksCards[deckCardsIndex].push(card);
    }

    return newDecksCards.map((deckCards) => new Deck(deckCards));
  }

  pickCard(): Card | null {
    return this.cards.shift() ?? null;
  }

  addCardsToBottom(...cards: Card[]) {
    this.cards.push(...cards);
  }

  get count(): number {
    return this.cards.length;
  }
}

export function createGameDeck(): Deck {
  const types = [
    "ace",
    "common",
    "common",
    "common",
    "common",
    "common",
    "common",
    "common",
    "common",
    "common",
    "jack",
    "queen",
    "king",
  ] as const;

  const variants = [
    {
      color: "#1c8ec0",
      types,
    },
    {
      color: "#d92d38",
      types,
    },
    {
      color: "#40be65",
      types,
    },
    {
      color: "#000000",
      types,
    },
  ];

  const cards = variants.flatMap(createCards);

  return new Deck(cards);
}

function createCards({
  color,
  types: values,
}: {
  color: string;
  types: readonly Card["type"][];
}) {
  return values.map(
    (type, index): Card => {
      let displayText: string;

      switch (type) {
        case "common":
          displayText = String(index + 1);
          break;
        case "jack":
          displayText = "J";
          break;
        case "queen":
          displayText = "Q";
          break;
        case "king":
          displayText = "K";
          break;
        case "ace":
          displayText = "A";
          break;
      }

      return {
        color,
        type,
        displayText,
        value: index,
      };
    }
  );
}
