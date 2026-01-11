import { useQuery } from "@tanstack/react-query";
import { FileText, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DerbyEventWithDetails } from "@shared/schema";

export default function Rules() {
  usePageTitle("Rules");
  const { data: activeEvent, isLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-2" />
            <Skeleton className="h-5 w-48 mx-auto" />
          </div>
          <Card>
            <CardHeader className="text-center">
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>No Active Event</CardTitle>
              <CardDescription>
                There is no active derby event at this time. Please check back later.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const hasRules = activeEvent?.rules && activeEvent.rules.trim().length > 0;

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2" data-testid="text-rules-title">
            Derby Rules & Guidelines
          </h1>
          <p className="text-muted-foreground">
            Everything you need to know about participating
          </p>
        </div>

        <Card>
          {hasRules ? (
            <CardContent className="prose dark:prose-invert max-w-none pt-6" data-testid="content-rules-markdown">
              <ReactMarkdown>{activeEvent.rules!}</ReactMarkdown>
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Rules Coming Soon</CardTitle>
                <CardDescription>
                  The official Pinewood Derby rules and guidelines will be posted here.
                </CardDescription>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <div className="bg-muted/50 rounded-lg p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-0">
                    Event organizers will add the official rules here. Check back soon for updates!
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
