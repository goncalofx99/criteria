const API = 'https://criteria-newn.onrender.com/graphql'

export async function gql(
  token: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}
