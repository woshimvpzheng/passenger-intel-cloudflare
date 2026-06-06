export function env(name, fallback = "") {
  const cloudflareValue = globalThis.__CF_ENV__?.[name];
  if (cloudflareValue) return cloudflareValue;
  const netlifyValue = globalThis.Netlify?.env?.get?.(name);
  if (netlifyValue) return netlifyValue;
  return globalThis.process?.env?.[name] || fallback;
}

export function isCloudflare() {
  return Boolean(globalThis.__CF_ENV__);
}

export function isNetlify() {
  return Boolean(globalThis.Netlify || globalThis.process?.env?.NETLIFY || isServerlessRuntime());
}

export function isProductionDeploy() {
  return globalThis.Netlify?.context?.deploy?.context === "production" || globalThis.process?.env?.CONTEXT === "production";
}

export function isServerlessRuntime() {
  const proc = globalThis.process;
  return Boolean(
    proc?.env?.AWS_LAMBDA_FUNCTION_NAME ||
    proc?.env?.LAMBDA_TASK_ROOT ||
    proc?.cwd?.() === "/var/task"
  );
}
