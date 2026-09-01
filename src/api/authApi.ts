import { apiClient, setAuthHeader } from './apiClient';

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
      // Fallback to V1 backend if V3 isn't running, gets blocked by middleware, or throws CORS
      try {
        response = await apiClient.post<LoginResponse>(
          "/v1/auth/login",
          form,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
      } catch (fallbackError: unknown) {
        throw fallbackError || primaryError;
      }
    }
    
    setAuthHeader(response.data.access_token);
    return response.data;
  }, 

  logout: async () => {
    setAuthHeader(null);
  }
};

export default authApi;
