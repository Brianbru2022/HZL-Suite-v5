export const APP_VERSION = '0.1.25';
export const APP_RELEASE_PHASE = 'Beta';
export const APP_RELEASE_LABEL = `v${APP_VERSION} ${APP_RELEASE_PHASE}`;
export const APP_RELEASE_DATE_ISO = '2026-08-07T00:00:00+01:00';
const DEFAULT_APP_EXPIRY_DATE_ISO = '2026-12-31T23:59:59+00:00';
const configuredExpiryDate = import.meta.env.VITE_APP_EXPIRY_DATE_ISO?.trim();

// Release builds can set a fixed expiry without changing the normal development build.
export const APP_EXPIRY_DATE_ISO = configuredExpiryDate || DEFAULT_APP_EXPIRY_DATE_ISO;
export const APP_EXPIRY_TIME = new Date(APP_EXPIRY_DATE_ISO).getTime();
