export interface Round {
  name: string;
  questions: Array<Question>;
  service: boolean;
}

export interface Question {
  id: string;
  expiry: number;
  start: number;
  minBid: number;
  allocated: boolean;
}

export interface History {
  id: string;
  bid: number;
}
