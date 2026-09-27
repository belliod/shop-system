import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';

const TOKEN_KEY = 'auth_token';

const request = axiosForBackend;

request.interceptors.request.use(
  (config) => {
    const token: string | null = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.set('x-auth-token', token);
    }
    return config;
  },
  (error: unknown) => {
    logger.error('request interceptor error', error);
    return Promise.reject(error);
  },
);

request.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const details =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: { message?: string } } } })
            .response?.data?.error?.message
        : undefined;

    if (details && typeof details === 'string' && details.length > 0) {
      const rewritten: Error = new Error(details);
      rewritten.name = 'ApiError';
      Object.assign(rewritten, { original: error });
      return Promise.reject(rewritten);
    }

    return Promise.reject(error);
  },
);

export { request };
