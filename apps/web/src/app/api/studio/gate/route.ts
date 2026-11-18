// Export gate for one rendered image.
// The browser renders a lossless PNG. This route runs the existing export
// quality gate on it (size from the platform pack, sRGB, no stretch, no
// crop, no upscaled design), encodes the platform JPG with the sRGB ICC
// profile embedded, and proves the profile from the JPG bytes.
//
// Limit, stated plainly: the placement numbers (where each surface lands
// in the image) are measured by the browser renderer and reported here.
// This route checks them, and checks the real pixel size and transparency
// of the PNG, but it does not re-render the scene.

import { ExportError, gateAndEncodeRenderedImage, type RenderedSurfaceGateInput } from "@listing-photos-generator/export";
import { checkSurfaceCrisp, surfaceAspectMismatch, type RenderedSurfaceReport } from "@listing-photos-generator/mockup-engine/studio";
import { requireSellerApi } from "@/lib/studio-api-auth";
import { getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface GateMeta {
  fileName: string;
  widthPx: number;
  heightPx: number;
  expectedWidthPx: number;
  expectedHeightPx: number;
  surfaces: RenderedSurfaceReport[];
}

const FILE_NAME = /^[0-9]{2}-[a-z0-9][a-z0-9-]*\.[a-z0-9]+$/;

export async function POST(request: Request): Promise<Response> {
  const access = await requireSellerApi("studio.gate");
  if (!access.ok) return access.response;
  let studio;
  try {
    studio = getStudioServer();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The studio is not available.", 503);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("The upload could not be read.", 400);
  }
  const file = form.get("png");
  const metaRaw = form.get("meta");
  if (!(file instanceof Blob) || typeof metaRaw !== "string") {
    return jsonError("Send the rendered PNG and its details.", 400);
  }
  if (file.size > studio.config.upload.maxDesignBytes) {
    return jsonError("The rendered image is larger than the upload limit.", 413);
  }
  let meta: GateMeta;
  try {
    meta = JSON.parse(metaRaw) as GateMeta;
  } catch {
    return jsonError("The image details are not valid JSON.", 400);
  }
  if (!FILE_NAME.test(meta.fileName ?? "") || !Array.isArray(meta.surfaces)) {
    return jsonError("The image details are incomplete.", 400);
  }

  const surfaces: RenderedSurfaceGateInput[] = meta.surfaces.map((report) => {
    const crisp = checkSurfaceCrisp({
      designWidthPx: report.designWidthPx,
      designHeightPx: report.designHeightPx,
      layout: report.layout,
      projectedWidthPx: report.projectedWidthPx,
      projectedHeightPx: report.projectedHeightPx,
    });
    const declaredAspect = report.layout.canvasWidthPx / report.layout.canvasHeightPx;
    return {
      surfaceId: `${report.modelId}/${report.surfaceId}`,
      designWidthPx: report.designWidthPx,
      designHeightPx: report.designHeightPx,
      placedWidthPx: crisp.placedWidthPx,
      placedHeightPx: crisp.placedHeightPx,
      stretched: report.layout.stretched !== false,
      cropped: report.layout.cropped !== false,
      aspectMismatch: surfaceAspectMismatch(declaredAspect, report.measuredAspect),
    };
  });

  try {
    const gated = await gateAndEncodeRenderedImage(
      {
        fileName: meta.fileName,
        widthPx: meta.widthPx,
        heightPx: meta.heightPx,
        expectedWidthPx: meta.expectedWidthPx,
        expectedHeightPx: meta.expectedHeightPx,
        colourProfile: "sRGB",
        colourChanged: false,
        cropApproved: false,
        surfaces,
        pack: studio.pack as Parameters<typeof gateAndEncodeRenderedImage>[0]["pack"],
      },
      new Uint8Array(await file.arrayBuffer()),
    );
    return Response.json({
      ok: true,
      fileName: gated.fileName,
      widthPx: gated.widthPx,
      heightPx: gated.heightPx,
      shortestSidePx: gated.shortestSidePx,
      format: gated.format,
      colourProfile: gated.colourProfile,
      iccProfile: gated.iccProfile,
      iccProfileEmbedded: gated.iccProfileEmbedded,
      iccVerification: gated.iccVerification,
      gate: gated.gate,
      jpgBase64: Buffer.from(gated.bytes).toString("base64"),
    });
  } catch (error) {
    if (error instanceof ExportError) {
      return jsonError(error.message, 422, { code: error.code, fix: error.fix });
    }
    return jsonError("The image could not be exported. Your design was not changed.", 500);
  }
}
