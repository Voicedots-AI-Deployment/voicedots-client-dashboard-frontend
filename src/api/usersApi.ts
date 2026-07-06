import { apiClient } from './apiClient';

export interface User {
    user_id: string;
    name: string;
    email: string;
    profile_picture?: string;
    agent_id?: string;
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
        const response = await apiClient.get<User>("/v1/users/me");
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
