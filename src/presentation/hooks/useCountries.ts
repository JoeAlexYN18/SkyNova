import { useEffect, useState } from 'react';
import { Country } from '@/domain/entities/Country';
import { fetchCountries } from '@/infrastructure/data/countries';

interface UseCountriesResult {
  countries: Country[];
  isLoading: boolean;
}

/**
 * Loads the country/dial-code list on mount (useEffect), exposing a loading
 * flag so the picker can show a spinner — exactly like it would while
 * waiting on a real `/countries` endpoint.
 */
export function useCountries(): UseCountriesResult {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetchCountries().then((data) => {
      if (!isMounted) return;
      setCountries(data);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { countries, isLoading };
}
