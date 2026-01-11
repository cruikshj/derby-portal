import { ExternalLink } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            &copy; {currentYear} Pinewood Derby. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover-elevate px-2 py-1 rounded-md flex items-center gap-1"
              data-testid="link-terms-of-service"
            >
              Terms of Service
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover-elevate px-2 py-1 rounded-md flex items-center gap-1"
              data-testid="link-privacy-policy"
            >
              Privacy Policy
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
