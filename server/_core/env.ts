export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappBusinessId: process.env.WHATSAPP_BUSINESS_ID ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  gmailEmail: process.env.GMAIL_EMAIL ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
};

// Aliases for backward compatibility
export const WHATSAPP_TOKEN = ENV.whatsappToken;
export const WHATSAPP_PHONE_NUMBER_ID = ENV.whatsappPhoneNumberId;
export const WHATSAPP_BUSINESS_ID = ENV.whatsappBusinessId;
export const WHATSAPP_VERIFY_TOKEN = ENV.whatsappVerifyToken;
