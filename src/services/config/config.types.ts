export interface TelegramConfig {
  bot_token: string;
  chat_id: number;
}

export interface AppConfig {
  telegram: TelegramConfig;
  books: string[];
}
