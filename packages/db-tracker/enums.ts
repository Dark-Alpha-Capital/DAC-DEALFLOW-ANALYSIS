export const SCREENER_CATEGORY_VALUES = ["Project Screener"] as const;
export type ScreenerCategoryValue = (typeof SCREENER_CATEGORY_VALUES)[number];

export { DEPARTMENT_VALUES, Department } from "@repo/enums";
export type { Department as DepartmentValue } from "@repo/enums";
