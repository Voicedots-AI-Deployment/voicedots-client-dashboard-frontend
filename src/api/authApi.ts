import { apiClient, setAuthHeader } from './apiClient';
import axios from 'axios';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

const authApi = {
  login: async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    const form = new URLSearchParams();

    form.append("email", email);
    form.append("password", password);

    let response;
    try {
      response = await apiClient.post<LoginResponse>(
        "/v3/auth/login",
        form,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
    } catch (primaryError: unknown) {
      // Retry only when the deployed backend explicitly does not provide V3.
      // Authentication and server failures must be shown as-is, not retried.
      const status = axios.isAxiosError(primaryError)
        ? primaryError.response?.status
        : undefined;
      if (status !== 404 && status !== 405 && status !== 501) {
        throw primaryError;
      }
      response = await apiClient.post<LoginResponse>(
        "/v1/auth/login",
        form,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
    }
    
    setAuthHeader(response.data.access_token);
    return response.data;
  }, 

  logout: async () => {
    setAuthHeader(null);
  }
};

export default authApi;
