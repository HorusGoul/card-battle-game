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

  split(): [Deck, Deck] {
    const halfPoint = this.cards.length / 2;

    const firstHalf = this.cards.splice(0, halfPoint);
    const secondHalf = this.cards.splice(0, halfPoint);

    return [new Deck(firstHalf), new Deck(secondHalf)];
  }

  pickCard(): Card | null {
    return this.cards.shift() ?? null;
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
