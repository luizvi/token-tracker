const ENDPOINT = "https://economia.awesomeapi.com.br/json/last/USD-BRL";

interface AwesomeApiResponse {
  USDBRL: { bid: string };
}

export async function fetchUsdBrlLatest(): Promise<number> {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`AwesomeAPI: HTTP ${res.status}`);
  const data = (await res.json()) as AwesomeApiResponse;
  const bid = Number(data.USDBRL?.bid);
  if (!Number.isFinite(bid) || bid <= 0) throw new Error(`AwesomeAPI: bid inválido ${data.USDBRL?.bid}`);
  return bid;
}
