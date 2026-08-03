/**
 * fetch→ok判定→JSONパースを1つにまとめ、ネットワーク失敗・非2xx・JSON形式不正の
 * いずれでも同じ利用者向けメッセージでthrowする。react-queryのqueryFnから使うことで、
 * QueryProviderのグローバルonErrorが一貫した日本語メッセージをトースト表示できるようにする。
 */
export async function fetchJson<T>(url: string, errorMessage: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // initが未指定のときは`fetch(url)`のまま呼ぶ（`fetch(url, undefined)`との
    // 呼び出しシグネチャの違いをテストの引数検証で拾われないようにする）
    res = init ? await fetch(url, init) : await fetch(url);
  } catch {
    throw new Error(errorMessage);
  }
  if (!res.ok) throw new Error(errorMessage);
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(errorMessage);
  }
}
