export interface Budget {
  id: string;
  amount: string; // TODO: Change to Decimal
  lastAlertSent?: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
