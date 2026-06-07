export function createInternalTools() {
  return {
    run({ actionName, parameters = {} }) {
      return {
        status: "completed",
        actionName,
        parameters,
        result: "Internal method completed.",
      };
    },
  };
}
