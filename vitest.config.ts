import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		globals: true,
		coverage: {
			reporter: ["text", "json", "html"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
