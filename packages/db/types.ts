import type {
  UserRole,
  Company,
  Founder,
  File,
  DueDiligenceSection,
} from "./schema";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
};

export type CompanyWithRelationsForList = Company & {
  founders: Founder[];
  files: File[];
  sections: DueDiligenceSection[];
  _count: {
    files: number;
    sections: number;
    reviews: number;
    tasks: number;
  };
};
