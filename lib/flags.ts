export const FEATURES = {
  AI_ENABLED: process.env.AI_ENABLED === "true",
  PREMIUM_ENABLED: process.env.PREMIUM_ENABLED === "true",
  SELLER_TOOLS_ENABLED: process.env.SELLER_TOOLS_ENABLED === "true",
  MARKETPLACE_ENABLED: process.env.MARKETPLACE_ENABLED === "true",
  PUSH_NOTIFICATIONS_ENABLED: process.env.PUSH_NOTIFICATIONS_ENABLED === "true",
  TWO_FACTOR_ENABLED: process.env.TWO_FACTOR_ENABLED === "true",
} as const;

// Future AI provider interface — app must work with AI disabled.
export interface AIProvider {
  classifyProduct?(input: string): Promise<string>;
  extractReceipt?(file: unknown): Promise<unknown>;
  normalizeProduct?(input: string): Promise<string>;
  naturalLanguageSearch?(q: string): Promise<string[]>;
  explainDeal?(score: number): Promise<string>;
}
export const aiProvider: AIProvider | null = null; // disabled by default
