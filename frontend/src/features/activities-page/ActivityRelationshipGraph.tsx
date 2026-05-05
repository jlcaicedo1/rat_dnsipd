import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import type {
  ActivityRegistryRecord,
  ActivityTraceabilityAsset,
  ActivityTraceabilityModel,
} from "../rat/rat-registry-data";

type ActivityRelationshipGraphProps = {
  activity: ActivityRegistryRecord;
  traceability: ActivityTraceabilityModel;
};

export function ActivityRelationshipGraph({
  activity,
  traceability,
}: ActivityRelationshipGraphProps) {
  const primaryAsset = traceability.activos[0] ?? null;
  const supportAssets = traceability.activos.slice(1, 5);
  const graphAssets = traceability.activos.length > 0 ? traceability.activos : null;
  const { nodes, edges } = useMemo(
    () => buildGraphModel(activity, traceability),
    [activity, traceability],
  );

  return (
    <section className="relationship-schema-card">
      <dl className="relationship-schema-meta">
        <SchemaMetaItem label="RAT" value={activity.ratCodigo} />
        <SchemaMetaItem label="Estado" value={activity.estado} />
        <SchemaMetaItem label="Riesgo" value={activity.riesgo} />
        <SchemaMetaItem label="Unidad ejecutora" value={activity.unidadEjecutora} />
      </dl>

      <div className="relationship-graph-board">
        <ReactFlow
          aria-label="Grafo de actividad y activos tecnologicos"
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          maxZoom={1.25}
          minZoom={0.55}
          nodes={nodes}
          nodesDraggable={false}
          nodesConnectable={false}
          nodeTypes={nodeTypes}
          panOnDrag
          proOptions={{ hideAttribution: true }}
          zoomOnDoubleClick={false}
        >
          <Background color="#d7e3ea" gap={22} size={1} variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>

      <div className="relationship-graph-summary">
        <div>
          <span className="relationship-schema-label">Actividad</span>
          <strong>{activity.codigo}</strong>
          <small>{shortenCopy(activity.nombre, 96)}</small>
        </div>
        <div>
          <span className="relationship-schema-label">Activos vinculados</span>
          <strong>{graphAssets?.length ?? 0}</strong>
          <small>{primaryAsset?.nombre ?? "Sin activo tecnologico asociado"}</small>
        </div>
        <div>
          <span className="relationship-schema-label">Custodio principal</span>
          <strong>{primaryAsset?.custodio ?? "Pendiente"}</strong>
          <small>{primaryAsset?.plataforma ?? "Plataforma no documentada"}</small>
        </div>
      </div>

      <div className="relationship-schema-detail-grid">
        <div className="relationship-schema-detail">
          <span className="relationship-schema-label">Soportes y artefactos tecnologicos</span>
          {supportAssets.length > 0 ? (
            <ul className="relationship-schema-list">
              {supportAssets.map((asset) => (
                <li key={asset.id}>
                  <strong>{asset.nombre}</strong>
                  <small>{formatAssetLine(asset)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <span className="relationship-schema-empty">
              Esta actividad no tiene soportes secundarios registrados.
            </span>
          )}
        </div>

        <div className="relationship-schema-detail">
          <span className="relationship-schema-label">Contexto de alojamiento del dato</span>
          <dl className="relationship-schema-context">
            <SchemaContextItem
              label="Proceso"
              value={buildProcessLine(activity.report.procesoRelacionado, activity.report.subproceso)}
            />
            <SchemaContextItem
              label="Plataforma"
              value={primaryAsset?.plataforma ?? "Pendiente de asociar"}
            />
            <SchemaContextItem
              label="Custodio tecnico"
              value={primaryAsset?.custodio ?? "Pendiente"}
            />
            <SchemaContextItem
              label="Datos alojados"
              value={traceability.categoriasDatos.join(", ")}
            />
            <SchemaContextItem
              label="Controles clave"
              value={traceability.controlesClave.slice(0, 3).join(" · ")}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

type GraphNodeData = {
  icon: AppIconName;
  kicker: string;
  title: string;
  lines: string[];
  tone?: "activity" | "asset" | "owner" | "empty";
};

const nodeTypes = {
  relationshipNode: RelationshipNode,
};

function buildGraphModel(
  activity: ActivityRegistryRecord,
  traceability: ActivityTraceabilityModel,
) {
  const assets = traceability.activos.length > 0 ? traceability.activos : null;
  const activityNodeId = "activity";
  const nodes: Node<GraphNodeData>[] = [
    {
      id: "owner",
      type: "relationshipNode",
      position: { x: 0, y: 20 },
      data: {
        icon: "owner",
        kicker: "Responsable",
        title: traceability.owner.nombre,
        lines: [traceability.owner.cargo, traceability.owner.unidad],
        tone: "owner",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Right,
    },
    {
      id: activityNodeId,
      type: "relationshipNode",
      position: { x: 360, y: 150 },
      data: {
        icon: "activity",
        kicker: "Actividad de tratamiento",
        title: activity.nombre,
        lines: [activity.codigo, activity.report.finalidadEspecifica],
        tone: "activity",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    },
  ];

  const edges: Edge[] = [
    {
      id: "owner-activity",
      source: "owner",
      target: activityNodeId,
      label: "administra",
      markerEnd: { type: MarkerType.ArrowClosed },
      type: "smoothstep",
    },
  ];

  if (!assets) {
    nodes.push({
      id: "asset-empty",
      type: "relationshipNode",
      position: { x: 760, y: 160 },
      data: {
        icon: "asset",
        kicker: "Activo tecnologico",
        title: "Sin activo asociado",
        lines: ["Seleccione un activo del inventario para cerrar la trazabilidad."],
        tone: "empty",
      },
      targetPosition: Position.Left,
    });
    edges.push({
      id: "activity-asset-empty",
      source: activityNodeId,
      target: "asset-empty",
      label: "requiere asociacion",
      markerEnd: { type: MarkerType.ArrowClosed },
      type: "smoothstep",
    });
    return { nodes, edges };
  }

  const startY = assets.length === 1 ? 150 : 30;
  assets.slice(0, 6).forEach((asset, index) => {
    const assetNodeId = `asset-${asset.id}`;

    nodes.push({
      id: assetNodeId,
      type: "relationshipNode",
      position: { x: 760, y: startY + index * 126 },
      data: {
        icon: index === 0 ? "asset" : "support",
        kicker: index === 0 ? "Activo principal" : "Activo de soporte",
        title: asset.nombre,
        lines: [`${asset.tipo} · ${asset.criticidad}`, `${asset.plataforma} · ${asset.custodio}`],
        tone: "asset",
      },
      targetPosition: Position.Left,
    });

    edges.push({
      id: `${activityNodeId}-${assetNodeId}`,
      source: activityNodeId,
      target: assetNodeId,
      label: index === 0 ? "contiene datos en" : "se apoya en",
      markerEnd: { type: MarkerType.ArrowClosed },
      type: "smoothstep",
    });
  });

  return { nodes, edges };
}

function RelationshipNode({ data }: NodeProps<Node<GraphNodeData>>) {
  return (
    <article className={`relationship-graph-node relationship-graph-node-${data.tone ?? "asset"}`}>
      <Handle type="target" position={Position.Left} />
      <div className="relationship-schema-block-head">
        <span className="relationship-schema-block-icon">
          <AppIcon name={data.icon} size={18} strokeWidth={2.1} />
        </span>
        <span className="relationship-schema-label">{data.kicker}</span>
      </div>
      <strong>{data.title}</strong>
      {data.lines.map((line) => (
        <small key={line}>{shortenCopy(line, 120)}</small>
      ))}
      <Handle type="source" position={Position.Right} />
    </article>
  );
}

function SchemaMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SchemaContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function buildProcessLine(process: string, subprocess: string) {
  if (!subprocess || subprocess === "N/A") {
    return process;
  }

  return `${process} / ${subprocess}`;
}

function formatAssetLine(asset: ActivityTraceabilityAsset) {
  return `${asset.tipo} · ${asset.criticidad} · ${asset.plataforma}`;
}

function shortenCopy(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}
