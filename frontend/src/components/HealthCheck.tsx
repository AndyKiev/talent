import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/client'

export function HealthCheck() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchHealth().then(setData).catch(console.error)
  }, [])

  console.log("data", data)

  return <pre>{JSON.stringify(data, null, 2)}</pre>
  // return <pre>{JSON.stringify(data)}</pre>
}
export default {HealthCheck}