export interface RegisterPayload {
    email: string;
    password: string;
    clubName: string;
}

export interface RegisterSuccess {
    message: string;
    requiresEmailConfirmation: boolean;
}

export interface RegisterResult {
    success: boolean;
    data?: RegisterSuccess;
    errors?: string[];
}

export interface AuthCallbackResult {
    success: boolean;
    message?: string;
    errors?: string[];
}
