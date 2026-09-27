import { request } from '@/utils/request';
import type {
  LoginResponse,
  UserInfo,
  CreateUserRequest,
  UpdateUserRequest,
} from '@shared/api.interface';

export const login = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  const res = await request.post('/api/auth/login', {
    username,
    password,
  });
  return res.data;
};

export const register = async (
  username: string,
  password: string,
  displayName?: string,
): Promise<void> => {
  await request.post('/api/auth/register', {
    username,
    password,
    displayName,
  });
};

export const getMe = async (): Promise<UserInfo> => {
  const res = await request.get('/api/auth/me');
  return res.data;
};

export const listUsers = async (): Promise<UserInfo[]> => {
  const res = await request.get('/api/auth/users');
  return res.data;
};

export const createUser = async (data: CreateUserRequest): Promise<UserInfo> => {
  const res = await request.post('/api/auth/users', data);
  return res.data;
};

export const updateUser = async (
  id: string,
  data: UpdateUserRequest,
): Promise<UserInfo> => {
  const res = await request.patch(`/api/auth/users/${id}`, data);
  return res.data;
};
