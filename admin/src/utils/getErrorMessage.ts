export const getErrorMessage = (error: unknown, fallback = '请求失败') => {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const anyError = error as { message?: string; response?: { data?: { error?: { message?: string } } } };
    return anyError.response?.data?.error?.message || anyError.message || fallback;
  }

  return fallback;
};
