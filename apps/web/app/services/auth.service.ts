import axiosInstance from '../lib/axios';
import { User, AuthResponse } from '../types/user.type';

export const authService = {
    login: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await axiosInstance.post<AuthResponse>('/auth/login', { email, password })
        return response.data;
    },

    register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
        const response = await axiosInstance.post<AuthResponse>('/auth/register', { name, email, password })
        return response.data;
    },

    logout: async () => {
        const response = await axiosInstance.post('/auth/logout')
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await axiosInstance.get<{ user: User }>('/auth/me')
        return response.data.user;
    }
} 