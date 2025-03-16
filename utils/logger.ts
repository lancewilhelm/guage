import pino, { Logger } from "pino";

let pinoConfig;

if (process.env["NODE_ENV"] === "production") {
  pinoConfig = {
    level: "warn",
    browser: {
      asObject: true,
    },
  };
} else {
  pinoConfig = {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
    level: "debug",
    browser: {
      asObject: false,
    },
  };
}

export const logger: Logger = pino(pinoConfig);
