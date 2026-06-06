import { refreshPipeline } from "../netlify/functions/_lib/pipeline.mjs";

const result = await refreshPipeline("local-script");
console.log(JSON.stringify(result, null, 2));

