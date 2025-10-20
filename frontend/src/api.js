export async function runQWalk(params) {
  const res = await fetch("http://localhost:8000/api/qwalk", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(params)
  });
  return res.json();
}
