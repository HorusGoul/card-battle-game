export interface Card {
  type: "common" | "ace" | "jack" | "queen" | "king";
  value: number;
  displayText: string;
  color: string;
}
