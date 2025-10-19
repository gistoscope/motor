export const FLAGS = {
  workers: !(globalThis as { MOTOR_DISABLE_WORKERS?: unknown }).MOTOR_DISABLE_WORKERS,
} as const;
