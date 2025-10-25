// api.js — call backend FastAPI /api/qwalk
export async function runQWalk(params) {
  try {
    const res = await fetch("http://localhost:8000/api/qwalk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error("network");
    return await res.json();
  } catch (e) {
    // return an error object so main.js can fallback
    return { error: "network" };
  }
}
