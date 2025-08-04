// "use client";

// import posthog from "posthog-js";
// import { PostHogProvider } from "posthog-js/react";
// import { useEffect } from "react";

// if (typeof window !== "undefined") {
//   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
//     api_host: "/ingest",
//     ui_host: "https://app.posthog.com",
//   });
// }

// export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
//   return (
//     <PostHogProvider client={posthog}>
//       <PostHogAuthWrapper>{children}</PostHogAuthWrapper>
//     </PostHogProvider>
//   );
// }

// function PostHogAuthWrapper({ children }: { children: React.ReactNode }) {
//   // const auth = useAuth();
//   // const userInfo = useUser();

//   useEffect(() => {
//     if (userInfo.user) {
//       posthog.identify(userInfo.user.id, {
//         email: userInfo.user.emailAddresses[0]?.emailAddress,
//         name: userInfo.user.fullName,
//       });
//     } else if (!auth.isSignedIn) {
//       posthog.reset();
//     }
//   }, [auth, userInfo]);

//   return children;
// }

// app/providers.jsx
// app/providers.tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import PostHogPageView from "./PostHogPageView";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    });
  }, []);

  return (
    <PHProvider client={posthog} data-oid="6-au2pl">
      <PostHogPageView data-oid="3e2m0et" />
      {children}
    </PHProvider>
  );
}
