import { useQuery } from "@tanstack/react-query";
import { Calendar, MessageSquare, ExternalLink, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

interface BandPost {
  postKey: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    profileImageUrl?: string;
  };
  photos?: { url: string }[];
}

interface BandEvent {
  eventKey: string;
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
}

interface BandData {
  posts: BandPost[];
  events: BandEvent[];
  connected: boolean;
}

function PostCard({ post }: { post: BandPost }) {
  const date = new Date(post.createdAt);

  return (
    <Card className="hover-elevate" data-testid={`card-post-${post.postKey}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {post.author.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <CardTitle className="text-base">{post.author.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        {post.photos && post.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {post.photos.slice(0, 4).map((photo, idx) => (
              <div key={idx} className="aspect-video rounded overflow-hidden bg-muted">
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventItem({ event }: { event: BandEvent }) {
  const startDate = new Date(event.startAt);
  const day = startDate.getDate();
  const month = startDate.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="flex gap-4 p-4 bg-card rounded-lg border hover-elevate" data-testid={`item-event-${event.eventKey}`}>
      <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-primary uppercase">{month}</span>
        <span className="text-xl font-bold text-primary">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-medium truncate">{event.title}</h4>
        <p className="text-sm text-muted-foreground">
          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {event.location && ` • ${event.location}`}
        </p>
      </div>
    </div>
  );
}

function BandNotConnected() {
  const { login, isAuthenticated } = useAuth();

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle>Band.us Not Connected</CardTitle>
        <CardDescription>
          {isAuthenticated
            ? "Band.us integration is not configured. Contact an administrator to set up the connection."
            : "Sign in with your Band account to see posts and events from your group."}
        </CardDescription>
      </CardHeader>
      {!isAuthenticated && (
        <CardContent className="text-center">
          <Button onClick={login} data-testid="button-connect-band">
            Connect with Band
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 bg-card rounded-lg border">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Band() {
  usePageTitle("Band Updates");
  const { data, isLoading, error, refetch, isRefetching } = useQuery<BandData>({
    queryKey: ["/api/band"],
    retry: false,
  });

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
              Band Updates
            </h1>
            <p className="text-muted-foreground">
              Latest posts and upcoming events from our Band group
            </p>
          </div>
          {data?.connected && (
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh-band"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error || !data?.connected ? (
          <BandNotConnected />
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="flex items-center gap-2 font-display font-semibold text-xl mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                Recent Posts
              </h2>
              {data.posts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No recent posts from the group
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {data.posts.map((post) => (
                    <PostCard key={post.postKey} post={post} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="flex items-center gap-2 font-display font-semibold text-xl mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </h2>
              {data.events.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No upcoming events scheduled
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.events.map((event) => (
                    <EventItem key={event.eventKey} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
