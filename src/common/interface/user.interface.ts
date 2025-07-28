import { RoleType } from "../enums/role.enum";

export interface UserFilters {
    page: number;
    limit: number;
    role?: RoleType;
    search?: string;
} 