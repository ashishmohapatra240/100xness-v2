import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { User, LoginRequest, RegisterRequest } from "../types/user.type";


export const useAuth = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    const { data: user, isLoading } = useQuery<User>({
        queryKey: ['user'],
        queryFn: authService.getCurrentUser,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const loginMutation = useMutation({
        mutationFn: ({ email, password }: LoginRequest) => authService.login(email, password),
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user);
            toast.success('Login successful!');
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.error || 'Login failed';
            toast.error(errorMessage);
        }
    });

    const registerMutation = useMutation({
        mutationFn: ({ name, email, password }: RegisterRequest) => authService.register(name, email, password),
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user);
            toast.success('Registration successful!');
            router.push('/');
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.error || 'Registration failed';
            toast.error(errorMessage);
        }
    });

    const logoutMutation = useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
            queryClient.invalidateQueries({ queryKey: ['user'] });
            toast.success('Logout successful');
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.error || 'Logout failed';
            toast.error(errorMessage);
        }
    });

    return {
        loginMutation,
        registerMutation,
        logoutMutation,
        user,
        isAuthenticated: !!user,
        isLoading
    }

}
