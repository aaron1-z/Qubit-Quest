const backendURL = 
  import.meta.env.VITE_BACKEND_URL || "https://qubit-quest-backend.onrender.com";

export async function runQWalk(params) {
  try {
    const res = await fetch($`{backendURL}/api/qwalk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error("network");
    return await res.json();
  } catch (e) {
    return { error: "network" };
  }
}