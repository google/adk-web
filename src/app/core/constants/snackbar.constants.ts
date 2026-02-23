/**
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0
 */

/** Snackbar message types */
export const SnackbarType = {
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export type SnackbarType = typeof SnackbarType[keyof typeof SnackbarType];
