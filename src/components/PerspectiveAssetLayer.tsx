import type { Point, Product } from "@/domain/types";
import { estimatePerspective } from "@/services/visualization/perspective";
import { Rod3DEditor } from "./Rod3DEditor";

type Props = { polygon: [Point, Point, Point, Point]; curtain?: Product; rod?: Product; bracket?: Product; finial?: Product; onDeleteRod: () => void; onDeleteCurtain: () => void; onDeleteBracket: () => void; onDeleteFinial: () => void };

export function PerspectiveAssetLayer({ polygon, curtain, rod, bracket, finial, onDeleteRod, onDeleteCurtain, onDeleteBracket, onDeleteFinial }: Props) {
  const pose = estimatePerspective(polygon);
  return <div className="perspectiveAssetLayer" data-renderer="perspective-web" data-yaw={pose.yaw.toFixed(2)}>
    {(curtain || rod || bracket || finial) && <Rod3DEditor key={`${curtain?.id ?? "none"}-${rod?.id ?? "none"}-${bracket?.id ?? "none"}-${finial?.id ?? "none"}`} polygon={polygon} rod={rod} curtain={curtain} bracket={bracket} finial={finial} onDeleteRod={onDeleteRod} onDeleteCurtain={onDeleteCurtain} onDeleteBracket={onDeleteBracket} onDeleteFinial={onDeleteFinial} />}
  </div>;
}
