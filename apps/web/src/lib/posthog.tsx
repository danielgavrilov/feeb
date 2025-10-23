import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useAuth } from "@/hooks/useAuth";

// Associates PostHog events with the authenticated user
export function PostHogUserDetector() {
  const posthog = usePostHog();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.email) {
      posthog.identify(user.id, { email: user.email });
    } else {
      posthog.reset();
    }
  }, [posthog, user]);

  return null;
}
