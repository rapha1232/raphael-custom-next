export async function fetcher<T = any>(
    input: RequestInfo,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(input, init);
    if (!res.ok) throw new Error("Request failed");
    return res.json();
}
