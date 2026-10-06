import { apiClient } from './apiClient';


export interface User {
    user_id: string;
    name: string;
    email: string;
    profile_picture?: string;
    agent_id?: string;
    portal_role?: "placement_staff";
}

export interface UserUpdateRequest {
    name?: string;
    email?: string;
    profile_picture?: string;
    current_password?: string;
}

export interface PasswordUpdateRequest {
    current_password?: string;
    new_password?: string;
}

const usersApi = {
    getMe: async (): Promise<User> => {
        // A stalled profile request must not leave ProtectedRoute on its
        // initial auth spinner indefinitely (common with expired sessions or
        // an unreachable API during local development).
        const response = await apiClient.get<User>("/v1/users/me", { timeout: 12000 });
        return response.data;
    },

    updateMe: async (data: UserUpdateRequest): Promise<User> => {
        const response = await apiClient.put<User>("/v1/users/me", data);
        return response.data;
    },

    updatePassword: async (data: PasswordUpdateRequest): Promise<{ status: string; message: string }> => {
        const response = await apiClient.put<{ status: string; message: string }>("/v1/users/me/password", data);
        return response.data;
    }
};

export default usersApi;
