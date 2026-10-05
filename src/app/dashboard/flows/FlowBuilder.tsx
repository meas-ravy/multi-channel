"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useState, useTransition } from "react";

import type {
  FlowDocument,
  FlowNodeData as BotNodeData,
  FlowNodeKind as BotNodeKind,
} from "@/lib/automation/flow-types";

import { publishFlow, saveFlow as saveFlowAction } from "./actions";

import "@xyflow/react/dist/style.css";

type BotNode = Node<BotNodeData, BotNodeKind>;

const INITIAL_NODES: BotNode[] = [
  {
    id: "start",
    type: "start",
    position: { x: 80, y: 210 },
    data: { label: "Start Bot Flow", content: "", options: "" },
  },
  {
    id: "welcome",
    type: "message",
    position: { x: 430, y: 130 },
    data: {
      label: "Welcome message",
      content: "Hello! How can we help you today?",
      options: "",
    },
  },
  {
    id: "quick-reply",
    type: "quickReply",
    position: { x: 820, y: 250 },
    data: {
      label: "Quick reply",
      content: "Choose an option",
      options: "Pricing, Support, Talk to a person",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "start-welcome",
    source: "start",
    sourceHandle: "next",
    target: "welcome",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "welcome-quick-reply",
    source: "welcome",
    sourceHandle: "quickReplies",
    target: "quick-reply",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

function TargetHandle() {
  return (
    <Handle
      type="target"
      position={Position.Left}
      className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
    />
  );
}

function SourceHandle({ id, top }: { id: string; top: string }) {
  return (
    <Handle
      id={id}
      type="source"
      position={Position.Right}
      style={{ top }}
      className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
    />
  );
}

function NodeShell({
  children,
  selected,
  tone = "blue",
}: {
  children: React.ReactNode;
  selected: boolean;
  tone?: "blue" | "violet" | "emerald" | "zinc";
}) {
  const tones = {
    blue: "border-blue-400",
    violet: "border-violet-400",
    emerald: "border-emerald-400",
    zinc: "border-zinc-300",
  };

  return (
    <div
      className={`w-64 rounded-2xl border-2 bg-white shadow-sm transition ${
        selected ? `${tones[tone]} shadow-lg` : "border-zinc-200"
      }`}
    >
      {children}
    </div>
  );
}

function StartNodeCard({ data, selected }: NodeProps<BotNode>) {
  return (
    <NodeShell selected={selected} tone="emerald">
      <div className="p-5">
        <p className="text-sm font-semibold text-zinc-900">🚶 {data.label}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Entry point for this automation.
        </p>
      </div>
      <div className="relative border-t border-dashed border-zinc-200 px-5 py-3 text-right text-xs font-medium text-zinc-600">
        Compose next message
        <SourceHandle id="next" top="50%" />
      </div>
    </NodeShell>
  );
}

function MessageNodeCard({ data, selected }: NodeProps<BotNode>) {
  return (
    <NodeShell selected={selected}>
      <TargetHandle />
      <div className="p-5">
        <p className="text-sm font-semibold text-zinc-900">💬 {data.label}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500">
          {data.content || "Add message text"}
        </p>
      </div>
      <div className="relative space-y-2 border-t border-dashed border-zinc-200 px-5 py-3 text-right text-xs font-medium text-zinc-600">
        <p>Next message</p>
        <p>Buttons</p>
        <p>Quick replies</p>
        <SourceHandle id="next" top="23%" />
        <SourceHandle id="buttons" top="50%" />
        <SourceHandle id="quickReplies" top="77%" />
      </div>
    </NodeShell>
  );
}

function AiNodeCard({ data, selected }: NodeProps<BotNode>) {
  return (
    <NodeShell selected={selected} tone="violet">
      <TargetHandle />
      <div className="p-5">
        <p className="text-sm font-semibold text-zinc-900">✨ {data.label}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500">
          {data.content || "Describe how the AI should reply"}
        </p>
        <span className="mt-3 inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
          Provider not connected
        </span>
      </div>
      <div className="relative space-y-2 border-t border-dashed border-zinc-200 px-5 py-3 text-right text-xs font-medium text-zinc-600">
        <p>Next message</p>
        <p>Buttons</p>
        <p>Quick replies</p>
        <SourceHandle id="next" top="23%" />
        <SourceHandle id="buttons" top="50%" />
        <SourceHandle id="quickReplies" top="77%" />
      </div>
    </NodeShell>
  );
}

function QuickReplyNodeCard({ data, selected }: NodeProps<BotNode>) {
  const options = data.options
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <NodeShell selected={selected} tone="emerald">
      <TargetHandle />
      <div className="p-5">
        <p className="text-sm font-semibold text-zinc-900">↩️ {data.label}</p>
        <p className="mt-2 text-xs text-zinc-500">{data.content}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {options.map((option) => (
            <span
              key={option}
              className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"
            >
              {option}
            </span>
          ))}
        </div>
      </div>
      <div className="border-t border-dashed border-zinc-200 px-5 py-3 text-xs font-medium text-zinc-600">
        {options.length > 0 ? options.map((option, index) => (
          <div key={`${option}-${index}`} className="relative py-1 text-right">
            {option}
            <SourceHandle id={`option:${index}`} top={`${((index + 1) / (options.length + 1)) * 100}%`} />
          </div>
        )) : <p className="text-right">Add an option</p>}
      </div>
    </NodeShell>
  );
}

const NODE_TYPES = {
  start: StartNodeCard,
  message: MessageNodeCard,
  ai: AiNodeCard,
  quickReply: QuickReplyNodeCard,
} satisfies NodeTypes;

function newNode(kind: Exclude<BotNodeKind, "start">, index: number): BotNode {
  const defaults: Record<Exclude<BotNodeKind, "start">, BotNodeData> = {
    message: {
      label: "Message",
      content: "Write your message here.",
      options: "",
    },
    ai: {
      label: "AI reply",
      content: "Reply helpfully using the conversation context.",
      options: "",
    },
    quickReply: {
      label: "Quick reply",
      content: "Choose an option",
      options: "Option one, Option two",
    },
  };

  return {
    id: crypto.randomUUID(),
    type: kind,
    position: { x: 260 + index * 24, y: 140 + index * 24 },
    data: defaults[kind],
  };
}

type FlowPage = {
  id: string;
  name: string;
  draft?: FlowDocument;
  publishedAt: string | null;
};

function pageFlow(page: FlowPage | undefined): { nodes: BotNode[]; edges: Edge[] } {
  return page?.draft
    ? { nodes: page.draft.nodes as BotNode[], edges: page.draft.edges as Edge[] }
    : { nodes: INITIAL_NODES, edges: INITIAL_EDGES };
}

export default function FlowBuilder({ pages }: { pages: FlowPage[] }) {
  const firstPage = pages[0];
  const initial = pageFlow(firstPage);
  const [pageId, setPageId] = useState(firstPage?.id ?? "");
  const [nodes, setNodes, onNodesChange] = useNodesState<BotNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState(firstPage?.draft ? "Draft loaded" : "New draft");
  const [savedFlows, setSavedFlows] = useState<Record<string, FlowDocument>>(() =>
    Object.fromEntries(pages.flatMap((page) => page.draft ? [[page.id, page.draft]] : [])),
  );
  const [isPending, startTransition] = useTransition();

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges,
        ),
      );
      setSaveStatus("Unsaved changes");
    },
    [setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      connection.source !== connection.target &&
      !edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.sourceHandle === connection.sourceHandle,
      ),
    [edges],
  );

  const addNode = useCallback(
    (kind: Exclude<BotNodeKind, "start">) => {
      const node = newNode(kind, nodes.length);
      setNodes((currentNodes) => [...currentNodes, node]);
      setSelectedNodeId(node.id);
      setSaveStatus("Unsaved changes");
    },
    [nodes.length, setNodes],
  );

  const updateSelectedNode = useCallback(
    (field: keyof BotNodeData, value: string) => {
      if (!selectedNodeId) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node,
        ),
      );
      setSaveStatus("Unsaved changes");
    },
    [selectedNodeId, setNodes],
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "start") {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== selectedNodeId),
    );
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
    setSaveStatus("Unsaved changes");
  }, [selectedNodeId, setEdges, setNodes]);

  const document = useCallback(
    (): FlowDocument => ({ version: 1, nodes, edges }),
    [edges, nodes],
  );

  const selectPage = useCallback((nextPageId: string) => {
    const page = pages.find((item) => item.id === nextPageId);
    const next = pageFlow(page ? { ...page, draft: savedFlows[nextPageId] } : undefined);
    setPageId(nextPageId);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNodeId(null);
    setSaveStatus("Draft loaded");
  }, [pages, savedFlows, setEdges, setNodes]);

  const persist = useCallback((publish: boolean) => {
    if (!pageId) return;
    setSaveStatus(publish ? "Publishing…" : "Saving…");
    startTransition(async () => {
      try {
        const flow = document();
        if (publish) await publishFlow(pageId, flow);
        else await saveFlowAction(pageId, flow);
        setSavedFlows((current) => ({ ...current, [pageId]: flow }));
        setSaveStatus(publish ? "Published" : "Draft saved");
      } catch (error) {
        setSaveStatus(error instanceof Error ? error.message : "Unable to save flow");
      }
    });
  }, [document, pageId]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1600px] grid-cols-1 overflow-hidden border-x border-zinc-200 bg-white lg:h-[calc(100vh-73px)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="relative min-h-[70vh] min-w-0 lg:min-h-0">
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <button className="flow-button" onClick={() => addNode("message")}>
            + Message
          </button>
          <button className="flow-button" onClick={() => addNode("quickReply")}>
            + Quick reply
          </button>
          <button className="flow-button" onClick={() => addNode("ai")}>
            + AI reply
          </button>
        </div>

        <ReactFlow<BotNode, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            setSaveStatus("Unsaved changes");
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            setSaveStatus("Unsaved changes");
          }}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          minZoom={0.3}
          maxZoom={1.8}
          className="bg-zinc-50"
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </section>

      <aside className="overflow-y-auto border-t border-zinc-200 bg-white p-5 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Flow settings</p>
            <p className="mt-1 text-xs text-zinc-500">{saveStatus}</p>
          </div>
          <div className="flex gap-2">
            <button disabled={!pageId || isPending} onClick={() => persist(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50">Save draft</button>
            <button disabled={!pageId || isPending} onClick={() => persist(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Publish</button>
          </div>
        </div>

        <label className="mt-5 block text-xs font-medium text-zinc-700">
          Facebook Page
          <select value={pageId} onChange={(event) => selectPage(event.target.value)} className="input mt-2" disabled={pages.length === 0}>
            {pages.length === 0 ? <option value="">Connect a Page first</option> : pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
          </select>
        </label>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          Save keeps a draft. Publish activates this flow for incoming Messenger messages. AI nodes are not available yet.
        </div>

        {selectedNode ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-700">Node name</label>
              <input
                value={selectedNode.data.label}
                onChange={(event) => updateSelectedNode("label", event.target.value)}
                className="input nodrag mt-2"
                maxLength={80}
              />
            </div>
            {selectedNode.type !== "start" ? (
              <div>
                <label className="text-xs font-medium text-zinc-700">
                  {selectedNode.type === "ai" ? "AI instruction" : "Message"}
                </label>
                <textarea
                  value={selectedNode.data.content}
                  onChange={(event) => updateSelectedNode("content", event.target.value)}
                  className="input nodrag mt-2 min-h-28 py-3"
                  maxLength={2000}
                />
              </div>
            ) : null}
            {selectedNode.type === "quickReply" ? (
              <div>
                <label className="text-xs font-medium text-zinc-700">
                  Options separated by commas
                </label>
                <textarea
                  value={selectedNode.data.options}
                  onChange={(event) => updateSelectedNode("options", event.target.value)}
                  className="input nodrag mt-2 min-h-24 py-3"
                  maxLength={500}
                />
              </div>
            ) : null}
            {selectedNode.id !== "start" ? (
              <button
                onClick={deleteSelectedNode}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete node
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 p-5 text-center text-sm leading-6 text-zinc-500">
            Select a node to edit its content.
          </div>
        )}
      </aside>
    </div>
  );
}
