import { useState } from "react";
import { toast } from "sonner";

interface FetchState<T> {
  loading: boolean;
  data: T | null;
  error: Error | null;
}

/**
 * Custom hook for making API calls with loading state and error handling
 * @param apiFunction The server action or API function to call
 * @param options Configuration options for the hook
 * @returns Object containing loading state, function to call, response data, and error
 */
export default function useFetch<TArgs extends unknown[], TResult>(
  apiFunction: (...args: TArgs) => Promise<TResult>,
  options: {
    showErrorToast?: boolean;
    onSuccess?: (result: TResult) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { showErrorToast = true, onSuccess, onError } = options;
  const [state, setState] = useState<FetchState<TResult>>({
    loading: false,
    data: null,
    error: null,
  });

  const fn = async (...args: TArgs): Promise<TResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiFunction(...args);
      setState({ loading: false, data: result, error: null });
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ loading: false, data: null, error });
      
      if (showErrorToast) {
        toast.error(error.message || "An error occurred");
      }
      
      onError?.(error);
      throw error;
    }
  };

  return {
    ...state,
    fn,
    reset: () => setState({ loading: false, data: null, error: null }),
  };
}
