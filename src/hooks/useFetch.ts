import { useState } from "react";
import { toast } from "sonner";

/**
 * - We pass an asynchronous function (e.g., createAccount) to useFetch.
 * - useFetch returns an object containing:
 *    - loading: A boolean indicating whether the request is in progress.
 *    - error: An error object if the request fails.
 *    - data: The response data if the request succeeds.
 *    - fn: A wrapped version of the original function, that handles the loading, error, and data states.
 */
const useFetch = (cb: Function) => {
  const [data, setData] = useState<any>(undefined);
  const [loading, setLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null | undefined>(null);

  const fn = async (...args: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await cb(...args);
      setData(response);
      setError(null);
    } catch (error) {
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
