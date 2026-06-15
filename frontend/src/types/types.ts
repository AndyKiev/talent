

export interface User {
    id: number;
    code: string;
    name: string;
}

export interface SnackbarType {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
}

