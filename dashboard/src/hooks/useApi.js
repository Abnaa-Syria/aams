import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, url, data, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService[method](url, data);
      if (options.successMessage) toast.success(options.successMessage);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'حدث خطأ';
      setError(message);
      if (!options.silent) toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, request };
}

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await apiService.get(url, params);
      setData(response.data.data);
      if (response.data.meta) setMeta(response.data.meta);
      return response.data;
    } catch (err) {
      if (!options.silent) toast.error(err.response?.data?.message || 'فشل في تحميل البيانات');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options.silent]);

  return { data, meta, loading, fetch, setData };
}
