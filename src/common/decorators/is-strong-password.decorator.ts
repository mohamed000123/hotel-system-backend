import { Matches } from 'class-validator';
import {
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_PATTERN,
} from '../password-policy';

/** Validates new-password fields (register, create admin/manager). */
export function IsStrongPassword(): PropertyDecorator {
  return Matches(STRONG_PASSWORD_PATTERN, {
    message: STRONG_PASSWORD_MESSAGE,
  });
}
