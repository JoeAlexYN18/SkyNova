import { useEffect, useState } from 'react';
import { Country } from '@/domain/entities/Country';
import { fetchCountries } from '@/infrastructure/data/countries';

interface UseCountriesResult {
  countries: Country[];
  isLoading: boolean;
}


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
