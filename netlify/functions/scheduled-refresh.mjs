import { refreshPipeline } from "./_lib/pipeline.mjs";

export default async function scheduledRefresh() {
  await refreshPipeline("scheduled");
  return new Response(null, { status: 204 });
}

export const config = {
  schedule: "0 23,1,3,5,7,9 * * *",
};
