import api from './axios';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export const categoriesApi = {
  list: async () => {
    const response = await api.get<ApiResponse<CategoryItem[]>>('/categories');
    return response.data;
  },
};
