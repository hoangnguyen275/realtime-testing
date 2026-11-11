import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = () => {
  const { accessToken, user, loading, refresh, fetchMe } = useAuthStore();
  const [starting, setStarting] = useState(true);

  const init = async () => {
    // may occur when the page is refreshed
    if (!accessToken) {
      await refresh();
    }

    if (accessToken && !user) {
      await fetchMe();
    }

    setStarting(false);
  };

  useEffect(() => {
    init();
  }, []);

  if (starting || loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-screen flex-col items-center justify-center gap-2 px-4 text-center"
      >
        <p className="text-lg font-medium">Loading page</p>
        <p className="text-sm text-muted-foreground">
          The project is starting up and it might take a few minutes
          <span aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.25}s`, animationDuration: "1s" }}
              >
                .
              </span>
            ))}
          </span>
        </p>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <Navigate
        to="/signin"
        replace
      />
    );
  }

  return <Outlet></Outlet>;
};

export default ProtectedRoute;
