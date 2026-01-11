import { useEffect } from "react";

export function usePageTitle(pageName: string) {
  useEffect(() => {
    document.title = `Pinewood Derby - ${pageName}`;
    return () => {
      document.title = "Pinewood Derby";
    };
  }, [pageName]);
}
