import type { UserRole } from "./enums";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
};

// Company-related types have been removed as the app now focuses
// solely on deal sourcing and screening.
