import { parseAuthRedirectParams } from "@f1/shared/lib/auth-redirect";

describe("parseAuthRedirectParams", () => {
  it("extracts a PKCE code from the query string of a custom-scheme deep link", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?code=abc-123"
    );
    expect(result.code).toBe("abc-123");
    expect(result.accessToken).toBeNull();
    expect(result.refreshToken).toBeNull();
    expect(result.errorDescription).toBeNull();
  });

  it("extracts a PKCE code from an Expo Go deep link", () => {
    const result = parseAuthRedirectParams(
      "exp://192.168.1.10:8081/--/auth/callback?code=xyz"
    );
    expect(result.code).toBe("xyz");
  });

  it("extracts implicit-flow tokens from the fragment", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback#access_token=at-1&refresh_token=rt-1&token_type=bearer"
    );
    expect(result.code).toBeNull();
    expect(result.accessToken).toBe("at-1");
    expect(result.refreshToken).toBe("rt-1");
    expect(result.errorDescription).toBeNull();
  });

  it("prefers fragment values over query values for the same key", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?access_token=stale#access_token=fresh"
    );
    expect(result.accessToken).toBe("fresh");
  });

  it("merges query and fragment params", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?code=abc#refresh_token=rt-2"
    );
    expect(result.code).toBe("abc");
    expect(result.refreshToken).toBe("rt-2");
  });

  it("decodes URL-encoded error descriptions from the fragment", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback#error=access_denied&error_description=User+cancelled%20the%20flow"
    );
    expect(result.errorDescription).toBe("User cancelled the flow");
  });

  it("falls back to the error param when error_description is absent", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?error=server_error"
    );
    expect(result.errorDescription).toBe("server_error");
  });

  it("prefers error_description over error", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?error=server_error&error_description=Something%20broke"
    );
    expect(result.errorDescription).toBe("Something broke");
  });

  it("returns all nulls for a URL with no auth params", () => {
    expect(parseAuthRedirectParams("f1prediction://auth/callback")).toEqual({
      code: null,
      accessToken: null,
      refreshToken: null,
      errorDescription: null,
    });
  });

  it("returns all nulls for a plain string without query or fragment", () => {
    expect(parseAuthRedirectParams("not-a-url")).toEqual({
      code: null,
      accessToken: null,
      refreshToken: null,
      errorDescription: null,
    });
  });

  it("treats empty param values as null", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?code=&error_description="
    );
    expect(result.code).toBeNull();
    expect(result.errorDescription).toBeNull();
  });

  it("handles https redirect URLs (web-style) the same way", () => {
    const result = parseAuthRedirectParams(
      "https://example.com/auth/callback?code=web-code"
    );
    expect(result.code).toBe("web-code");
  });

  it("keeps extra ? and # characters inside values intact", () => {
    const result = parseAuthRedirectParams(
      "f1prediction://auth/callback?code=a?b#refresh_token=r#t"
    );
    // The second "?" belongs to the code value; everything after the first
    // "#" is one fragment, so the stray "#" stays inside the token value.
    expect(result.code).toBe("a?b");
    expect(result.refreshToken).toBe("r#t");
  });
});
