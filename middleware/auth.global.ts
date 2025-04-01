import { authClient } from "@/utils/authClient";
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch);
  if (!session.value?.session) {
    if (to.path !== "/login") {
      return navigateTo("/login");
    }
  }
});
