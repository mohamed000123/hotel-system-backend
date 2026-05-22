/**
 * Strong password rules for registration and staff account creation.
 * Keep in sync with frontend/src/lib/validation/password.ts
 */
export const STRONG_PASSWORD_MIN_LENGTH = 8;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

/** At least 8 chars, one upper, one lower, one digit, one non-alphanumeric. */
export const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
