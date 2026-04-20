export async function fetchHealth() {
  const res = await fetch('/api/v1/health')
  // const res = await fetch('/api/v1/settings/langs/')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}
export default {fetchHealth}