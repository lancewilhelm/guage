import { authClient } from "~/utils/authClient";
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  const { data: session } = await authClient.useSession(useFetch);
  if (!session.value?.session) {
    if (to.path !== "/login" && to.path !== "/register") {
      return navigateTo("/login");
    }
  } else {
    if (to.path === "/login" || to.path === "/register" || to.path === "/") {
      return navigateTo("/chat");
    } else if (
      to.path === "/settings/admin" &&
      session.value.user.role !== "admin"
    ) {
      return navigateTo("/settings");
    }
  }
});
