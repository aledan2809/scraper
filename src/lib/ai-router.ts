import { AIRouter, getProjectPreset } from "./vendor/ai-router";

const preset = getProjectPreset("scrap-module");

export const aiRouter = new AIRouter({
  ...preset,
  projectName: "Scrap-module",
});

export { aiRouter as router };
