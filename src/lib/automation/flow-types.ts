export type FlowNodeKind = "start" | "message" | "ai" | "quickReply";

export type FlowNodeData = {
  label: string;
  content: string;
  options: string;
};

export type FlowNode = {
  id: string;
  type: FlowNodeKind;
  position: { x: number; y: number };
  data: FlowNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type FlowDocument = {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export function parseFlowDocument(value: unknown): FlowDocument | null {
  if (!value || typeof value !== "object") return null;
  const flow = value as Partial<FlowDocument>;
  if (flow.version !== 1 || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
    return null;
  }

  const validNodes = flow.nodes.every(
    (node) =>
      node &&
      typeof node.id === "string" &&
      ["start", "message", "ai", "quickReply"].includes(node.type) &&
      node.data &&
      typeof node.data.label === "string" &&
      typeof node.data.content === "string" &&
      typeof node.data.options === "string" &&
      node.position &&
      Number.isFinite(node.position.x) &&
      Number.isFinite(node.position.y),
  );
  const nodeIds = new Set(flow.nodes.map((node) => node.id));
  const validEdges = flow.edges.every(
    (edge) =>
      edge &&
      typeof edge.id === "string" &&
      typeof edge.source === "string" &&
      typeof edge.target === "string" &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target),
  );

  return validNodes && validEdges ? (flow as FlowDocument) : null;
}

export function validatePublishedFlow(flow: FlowDocument): void {
  const starts = flow.nodes.filter((node) => node.type === "start");
  if (starts.length !== 1) throw new Error("Flow must contain exactly one Start node");
  if (!flow.edges.some((edge) => edge.source === starts[0].id)) {
    throw new Error("Connect the Start node before publishing");
  }
  if (flow.nodes.some((node) => node.type === "ai")) {
    throw new Error("AI nodes cannot be published until an AI provider is connected");
  }
  for (const node of flow.nodes) {
    if (node.type !== "start" && !node.data.content.trim()) {
      throw new Error(`${node.data.label || node.type} needs message text`);
    }
  }
}
