/**
 * Cross-app links. This is a three-app platform (customer / partner / delivery),
 * each deployed separately, so owners and delivery partners who sign in here are
 * nudged to their own dashboard rather than shown a role view in the customer app.
 *
 * These are the deployed URLs, hardcoded on purpose: the customer app has no
 * per-environment config mechanism (API calls use relative paths proxied by
 * nginx). If this ever needs to vary per environment, inject it at container
 * start the way API_GATEWAY_URL is, and read it from a runtime config instead.
 */
export const PARTNER_APP_URL = 'https://partner-app-65z2.onrender.com';
export const DELIVERY_APP_URL = 'https://delivery-app-csdw.onrender.com';
