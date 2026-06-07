import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const profilesDirectory = fileURLToPath(new URL("../../config/profiles/", import.meta.url));
export function loadEngineProfile(profileId) {
  const profile = {
    ...readConfig(profileId, "business"),
    ...readConfig(profileId, "conversation"),
    ...readConfig(profileId, "integrations"),
    data: readConfig(profileId, "data"),
  };
  profile.externalIntegrations = loadExternalIntegrations(profileId);

  if (profile.id !== profileId) {
    throw new Error(`Engine profile "${profileId}" has mismatched business configuration.`);
  }
  if (profile.data.adapter !== "firestore") {
    throw new Error(`Engine profile "${profileId}" uses unsupported data adapter "${profile.data.adapter}".`);
  }
  if (profile.action?.path === "external_api" && !profile.externalIntegrations[profile.action.integration]) {
    throw new Error(`Engine profile "${profileId}" has no external integration "${profile.action.integration}".`);
  }
  return profile;
}

function loadExternalIntegrations(profileId) {
  const directory = `${profilesDirectory}${profileId}/integrations`;
  try {
    return Object.fromEntries(
      readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
        .map((entry) => {
          const integration = parse(readFileSync(`${directory}/${entry.name}`, "utf8"));
          return [integration.id, integration];
        }),
    );
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

export function listEngineProfileIds() {
  return readdirSync(profilesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readConfig(profileId, name) {
  try {
    const path = `${profilesDirectory}${profileId}/${name}.yaml`;
    return parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Unknown engine profile "${profileId}" or missing ${name}.yaml.`);
    }
    throw error;
  }
}
