export interface Round {
  name: string;
  questions: Array<Question>;
  minBid: number;
}

export interface Question {
  id: string;
  expiry: number;
}

export interface History {
  id: string;
  bid: number;
}
