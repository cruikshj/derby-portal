import { useQuery } from "@tanstack/react-query";

interface AppConfig {
  packName: string | null;
}

export function usePackName() {
  const { data, isLoading } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
    staleTime: Infinity,
  });
  return {
    packName: data?.packName ?? null,
    isLoading,
  };
}
