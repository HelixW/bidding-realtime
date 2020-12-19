export interface Round {
  name: string;
  questions: Array<Question>;
  minBid: number;
  service: boolean;
}

export interface Question {
  id: string;
  expiry: number;
  start: number;
  allocated: boolean;
}

export interface History {
  id: string;
  bid: number;
}
