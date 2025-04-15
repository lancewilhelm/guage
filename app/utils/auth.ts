import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cloudDb } from "./db/cloud";
import * as schema from "./db/schema";
import { count } from "drizzle-orm";

export const auth = betterAuth({
  baseURL: getBaseURL(),
  advanced: {
    cookiePrefix: "guage",
  },
  database: drizzleAdapter(cloudDb, {
    provider: "sqlite",
    schema: {
      ...schema,
    },
    usePlural: true,
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if registration is allowed
          const response = await cloudDb.select().from(schema.globalSettings);
          const settings = response[0]?.settings as GlobalSettings;
          const allowRegistration = settings.allowRegistration ?? false;

          if (!allowRegistration) {
            throw new APIError("UNAUTHORIZED", {
              message: "Registration is closed.",
            });
          }

          // Determine if this is the first user
          const userCount = await cloudDb
            .select({ count: count() })
            .from(schema.users);
          const isFirstUser = !userCount[0] || userCount[0].count === 0;
          const role = isFirstUser ? "admin" : "user";

          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },
    },
  },
});

function getBaseURL() {
  let baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) {
    try {
      baseURL = getRequestURL(useEvent()).origin;
    } catch {
      //pass
    }
  }
  return baseURL;
}
