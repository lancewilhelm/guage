import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cloudDb } from "./cloud/db";
import * as schema from "./cloud/schema";

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
});
