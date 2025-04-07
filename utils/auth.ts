import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cloudDb } from "./db/cloud";
import * as schema from "./db/schema";
import { count } from "drizzle-orm";

export const auth = betterAuth({
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
          // Determine if this is the first user
          const userCount = await cloudDb
            .select({ count: count() })
            .from(schema.users);
          const isFirstUser = userCount[0].count === 0;
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
