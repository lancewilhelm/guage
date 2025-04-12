import { defu } from "defu";
import type { RouteLocationRaw } from "vue-router";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";

export const typedClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
      },
    }),
  ],
});

export type Session = typeof typedClient.$Infer.Session.session;
export type User = typeof typedClient.$Infer.Session.user;

interface RuntimeAuthConfig {
  redirectUserTo: RouteLocationRaw | string;
  redirectGuestTo: RouteLocationRaw | string;
}

export function useAuth() {
  const url = useRequestURL();
  const headers = import.meta.server ? useRequestHeaders() : undefined;

  const client = createAuthClient({
    baseURL: url.origin,
    fetchOptions: {
      headers,
    },
    plugins: [
      inferAdditionalFields({
        user: {
          role: {
            type: "string",
            required: true,
            defaultValue: "user",
            input: false,
          },
        },
      }),
    ],
  });

  const options = defu(
    useRuntimeConfig().public.auth as Partial<RuntimeAuthConfig>,
    {
      redirectUserTo: "/chat",
      redirectGuestTo: "/login",
    },
  );
  const session = useState<Session | null>("auth:session", () => null);
  const user = useState<User | null>("auth:user", () => null);
  const sessionFetching = import.meta.server
    ? ref(false)
    : useState("auth:sessionFetching", () => false);

  const fetchSession = async () => {
    if (sessionFetching.value) {
      console.log("already fetching session");
      return;
    }
    sessionFetching.value = true;
    const { data } = await client.getSession({
      fetchOptions: {
        headers,
      },
    });
    session.value = data?.session || null;
    user.value = data?.user || null;
    sessionFetching.value = false;
    return data;
  };

  if (import.meta.client) {
    client.$store.listen("$sessionSignal", async (signal) => {
      if (!signal) return;
      await fetchSession();
    });
  }

  return {
    session,
    user,
    loggedIn: computed(() => !!session.value),
    signIn: client.signIn,
    signUp: client.signUp,
    changePassword: client.changePassword,
    changeEmail: client.changeEmail,
    async signOut() {
      const res = await client.signOut();
      session.value = null;
      user.value = null;
      loadTheme("guage");
      await navigateTo("/login");
      return res;
    },
    options,
    fetchSession,
    client,
  };
}
