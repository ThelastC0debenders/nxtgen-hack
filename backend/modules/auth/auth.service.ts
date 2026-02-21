import { signToken } from "./jwt";
import { Role } from "./roles";

export function login(id: string, role: Role): string {
    return signToken({ id, role });
}
