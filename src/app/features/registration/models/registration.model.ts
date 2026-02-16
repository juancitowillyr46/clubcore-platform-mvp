export interface RegisterPayload {
    email: string;
    password: string;
    clubName: string;
}

export interface RegisterSuccess {
    adminId: string;
    clubId: string;
    message: string;
}

export interface RegisterResult {
    success: boolean;
    data?: RegisterSuccess;
    errors?: string[];
}
