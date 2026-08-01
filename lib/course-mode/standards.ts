import { z } from "zod";

const CaseUriSchema = z.object({
  identifier: z.string().min(1).max(300),
  uri: z.string().url().max(2000),
  title: z.string().max(500).optional(),
});

const CaseDocumentSchema = z.object({
  identifier: z.string().min(1).max(300),
  uri: z.string().url().max(2000),
  creator: z.string().max(500).optional(),
  title: z.string().min(1).max(500),
  lastChangeDateTime: z.string().max(100).optional(),
  language: z.string().max(30).optional(),
  adoptionStatus: z.string().max(100).optional(),
}).passthrough();

const CaseItemSchema = z.object({
  identifier: z.string().min(1).max(300),
  uri: z.string().url().max(2000),
  fullStatement: z.string().max(20_000).optional(),
  humanCodingScheme: z.string().max(300).optional(),
  educationLevel: z.array(z.string().max(100)).max(30).optional(),
  CFDocumentURI: CaseUriSchema.optional(),
  lastChangeDateTime: z.string().max(100).optional(),
  itemType: z.string().max(200).optional(),
}).passthrough();

const CaseAssociationSchema = z.object({
  identifier: z.string().min(1).max(300),
  uri: z.string().url().max(2000).optional(),
  associationType: z.string().min(1).max(200),
  originNodeURI: CaseUriSchema,
  destinationNodeURI: CaseUriSchema,
  lastChangeDateTime: z.string().max(100).optional(),
}).passthrough();

const CasePackageSchema = z.object({
  CFDocuments: z.array(CaseDocumentSchema).max(500),
  CFItems: z.array(CaseItemSchema).max(100_000),
  CFAssociations: z.array(CaseAssociationSchema).max(250_000),
});

export type CaseDocument = z.infer<typeof CaseDocumentSchema>;
export type CaseItem = z.infer<typeof CaseItemSchema>;
export type CaseAssociation = z.infer<typeof CaseAssociationSchema>;

export type NormalizedCasePackage = {
  documents: CaseDocument[];
  items: CaseItem[];
  associations: CaseAssociation[];
  warnings: string[];
};

export function normalizeCasePackage(value: unknown): NormalizedCasePackage {
  const parsed = CasePackageSchema.parse(value);
  const itemUris = new Set(parsed.CFItems.map((item) => item.uri));
  const warnings = parsed.CFAssociations.flatMap((association) => {
    const missing = [association.originNodeURI.uri, association.destinationNodeURI.uri]
      .filter((uri) => !itemUris.has(uri));
    return missing.length > 0
      ? [`Association ${association.identifier} references ${missing.length} item URI(s) outside this package.`]
      : [];
  });
  return {
    documents: parsed.CFDocuments,
    items: parsed.CFItems,
    associations: parsed.CFAssociations,
    warnings,
  };
}

export type LearningObjectiveNode = {
  id: string;
  title: string;
};

export type PrerequisiteEdge = {
  prerequisiteId: string;
  objectiveId: string;
  minimumMastery?: number;
};

export type PrerequisiteGraph = {
  order: string[];
  incoming: Map<string, PrerequisiteEdge[]>;
};

export function buildPrerequisiteGraph(
  objectives: readonly LearningObjectiveNode[],
  edges: readonly PrerequisiteEdge[],
): PrerequisiteGraph {
  const ids = new Set(objectives.map((objective) => objective.id));
  if (ids.size !== objectives.length) throw new TypeError("Learning objective IDs must be unique.");
  const incoming = new Map(objectives.map((objective) => [objective.id, [] as PrerequisiteEdge[]]));
  const outgoing = new Map(objectives.map((objective) => [objective.id, [] as string[]]));
  const indegree = new Map(objectives.map((objective) => [objective.id, 0]));

  for (const edge of edges) {
    if (!ids.has(edge.prerequisiteId) || !ids.has(edge.objectiveId)) {
      throw new TypeError("Prerequisite edges must reference known learning objectives.");
    }
    if (edge.prerequisiteId === edge.objectiveId) {
      throw new TypeError("A learning objective cannot be its own prerequisite.");
    }
    incoming.get(edge.objectiveId)!.push(edge);
    outgoing.get(edge.prerequisiteId)!.push(edge.objectiveId);
    indegree.set(edge.objectiveId, (indegree.get(edge.objectiveId) ?? 0) + 1);
  }

  const ready = objectives.filter((objective) => indegree.get(objective.id) === 0).map((objective) => objective.id);
  const order: string[] = [];
  while (ready.length > 0) {
    const current = ready.shift()!;
    order.push(current);
    for (const next of outgoing.get(current) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    }
  }
  if (order.length !== objectives.length) {
    throw new TypeError("Prerequisite graph contains a cycle.");
  }
  return { order, incoming };
}

export type ObjectiveReadiness = {
  ready: boolean;
  unmet: Array<{
    objectiveId: string;
    currentMastery: number;
    requiredMastery: number;
  }>;
};

export function evaluateObjectiveReadiness(
  objectiveId: string,
  graph: PrerequisiteGraph,
  mastery: Readonly<Record<string, number>>,
  defaultMinimumMastery = 0.7,
): ObjectiveReadiness {
  const prerequisites = graph.incoming.get(objectiveId);
  if (!prerequisites) throw new TypeError("Learning objective is not in the prerequisite graph.");
  const unmet = prerequisites.flatMap((edge) => {
    const currentMastery = Math.min(1, Math.max(0, mastery[edge.prerequisiteId] ?? 0));
    const requiredMastery = Math.min(1, Math.max(0, edge.minimumMastery ?? defaultMinimumMastery));
    return currentMastery < requiredMastery
      ? [{ objectiveId: edge.prerequisiteId, currentMastery, requiredMastery }]
      : [];
  });
  return { ready: unmet.length === 0, unmet };
}
