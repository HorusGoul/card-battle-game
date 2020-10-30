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

  get count(): number {
    return this.cards.length;
  }
}

export function createGameDeck(): Deck {
  const values = [
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
    "common",
    "jack",
    "queen",
    "king",
  ] as const;

  const variants = [
    {
      color: "#00ffae",
      values,
    },
    {
      color: "#ff8c00",
      values,
    },
    {
      color: "#ee00ff",
      values,
    },
    {
      color: "#ffffff",
      values,
    },
  ];

  const cards = variants.flatMap(createCards);

  return new Deck(cards);
}

function createCards({
  color,
  values,
}: {
  color: string;
  values: readonly Card["value"][];
}) {
  return values.map(
    (value, index): Card => {
      let displayText: string;

      switch (value) {
        case "common":
          displayText = index.toString();
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
        value,
        displayText,
      };
    }
  );
}
