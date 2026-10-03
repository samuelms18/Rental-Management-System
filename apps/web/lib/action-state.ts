/** Shape returned by every server action used with <ActionForm>. Error values are i18n keys under "errors.". */
export type ActionState = {
  ok?: boolean;
  errors?: Record<string, string>;
  /** i18n key (full path) for a success or info message. */
  message?: string;
  messageValues?: Record<string, string | number>;
  /** Untranslated detail (database message) shown under a generic error. */
  detail?: string;
  /** Optional redirect target handled by the client after success. */
  redirectTo?: string;
};

export const initialState: ActionState = {};
