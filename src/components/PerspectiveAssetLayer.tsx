import { estimatePerspective } from "@/services/visualization/perspective";
import type { RodEditorProps } from "./Rod3DEditor";
import { ImageAssetEditor } from "./ImageAssetEditor";

export function PerspectiveAssetLayer(props: RodEditorProps) {
  const pose = estimatePerspective(props.polygon);
  const products = [props.curtain, props.rod, props.bracket, props.finial, props.hook, props.wand, props.cord];
  return <div className="perspectiveAssetLayer" data-renderer="perspective-web" data-yaw={pose.yaw.toFixed(2)}>
    {products.some(Boolean) && <ImageAssetEditor key={products.map((product) => product?.id ?? "none").join("-")} {...props} />}
  </div>;
}
