import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const scenariosDirectory = fileURLToPath(new URL("../scenarios/", import.meta.url));
const seedCollections = ["customers", "policies", "documents", "records"];

export const simulationScenarios = loadScenarios();

function loadScenarios() {
  return readdirSync(scenariosDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadScenario(entry.name))
    .sort((left, right) => left.order - right.order)
    .map(({ order: _order, ...scenario }) => ({
      ...scenario,
      firestoreSimulationId: scenario.id,
    }));
}

function loadScenario(id) {
  const directory = `${scenariosDirectory}${id}`;
  const scenario = parse(readFileSync(`${directory}/scenario.yaml`, "utf8"));
  const seed = Object.fromEntries(
    seedCollections.map((name) => [
      name,
      JSON.parse(readFileSync(`${directory}/seed/${name}.json`, "utf8")),
    ]),
  );
  return { ...scenario, seed };
}
