export const ROLES = {
    ADMIN: "ADMIN",
    LENDER: "LENDER",
    VENDOR: "VENDOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
