type D1QueryValue = string | number | boolean | null;

type D1PreparedStatementResult<T> = {
  results?: T[];
  success?: boolean;
};

type D1PreparedStatementLike = {
  bind: (...values: D1QueryValue[]) => D1PreparedStatementLike;
  run: <T = Record<string, unknown>>() => Promise<D1PreparedStatementResult<T>>;
};

type D1DatabaseLike = {
  prepare: (sql: string) => D1PreparedStatementLike;
};

type D1QueryOptions = {
  env?: {
    DB?: D1DatabaseLike;
  };
  db?: D1DatabaseLike;
};

type D1RestResponse<T> = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{
    success?: boolean;
    results?: T[];
  }>;
};

function getBoundDatabase(options?: D1QueryOptions) {
  if (options?.db) {
    return options.db;
  }

  if (options?.env?.DB) {
    return options.env.DB;
  }

  const globalBinding = (globalThis as typeof globalThis & {
    __AUDIO_PAPER_LIBRARY_D1__?: D1DatabaseLike;
  }).__AUDIO_PAPER_LIBRARY_D1__;

  return globalBinding;
}

function getRestConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    return null;
  }

  return {
    accountId,
    databaseId,
    apiToken,
  };
}

function normalizeRestParams(params: D1QueryValue[]) {
  return params.map((value) => {
    if (value === null) {
      return null;
    }

    return String(value);
  });
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: D1QueryValue[] = [],
  options?: D1QueryOptions,
) {
  const boundDatabase = getBoundDatabase(options);

  if (boundDatabase) {
    const statement = boundDatabase.prepare(sql).bind(...params);
    const result = await statement.run<T>();

    return result.results ?? [];
  }

  const restConfig = getRestConfig();

  if (!restConfig) {
    throw new Error(
      "D1 is not configured. Provide an env.DB binding or set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_D1_API_TOKEN.",
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${restConfig.accountId}/d1/database/${restConfig.databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${restConfig.apiToken}`,
      },
      body: JSON.stringify({
        sql,
        params: normalizeRestParams(params),
      }),
    },
  );

  const payload = (await response.json()) as D1RestResponse<T>;

  if (!response.ok || !payload.success) {
    const errorMessage =
      payload.errors?.map((error) => error.message).filter(Boolean).join(", ") ||
      "D1 query failed.";

    throw new Error(errorMessage);
  }

  return payload.result?.[0]?.results ?? [];
}
