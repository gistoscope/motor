import beginner from './beginner.json';
import standard from './standard.json';
import advanced from './advanced.json';

export const profiles = { beginner, standard, advanced } as const;
export type ProfileId = keyof typeof profiles;
