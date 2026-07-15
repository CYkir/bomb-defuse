import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  vite: {
    server: {
      host: "0.0.0.0",
      allowedHosts: [
        "bomb.cykir.web.id",
      ],
    },

    preview: {
      host: "0.0.0.0",
      allowedHosts: [
        "bomb.cykir.web.id",
      ],
    },
  },
});