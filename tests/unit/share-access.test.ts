import { describe, expect, it } from "vitest";
import {
  permissionAtLeast,
  targetedShareGrants,
  tokenShareAllowsAccess,
} from "@/lib/permissions/share-access";

describe("permissionAtLeast", () => {
  it("VIEW < COMMENT < EDIT < MANAGE", () => {
    expect(permissionAtLeast("VIEW", "VIEW")).toBe(true);
    expect(permissionAtLeast("VIEW", "COMMENT")).toBe(false);
    expect(permissionAtLeast("COMMENT", "COMMENT")).toBe(true);
    expect(permissionAtLeast("EDIT", "COMMENT")).toBe(true);
    expect(permissionAtLeast("MANAGE", "EDIT")).toBe(true);
    expect(permissionAtLeast("COMMENT", "EDIT")).toBe(false);
  });
});

describe("targetedShareGrants", () => {
  const openComment = {
    permission: "COMMENT" as const,
    sharedById: "owner",
    sharedWithId: null,
  };
  const targetedComment = {
    permission: "COMMENT" as const,
    sharedById: "owner",
    sharedWithId: "friend",
  };

  it("denies ambient open-link grants (IDOR fix)", () => {
    expect(targetedShareGrants(openComment, "stranger", "COMMENT")).toBe(false);
    expect(targetedShareGrants(openComment, "stranger", "VIEW")).toBe(false);
  });

  it("allows owner via share row", () => {
    expect(targetedShareGrants(openComment, "owner", "COMMENT")).toBe(true);
  });

  it("allows targeted grantee only", () => {
    expect(targetedShareGrants(targetedComment, "friend", "COMMENT")).toBe(true);
    expect(targetedShareGrants(targetedComment, "stranger", "COMMENT")).toBe(false);
  });

  it("respects permission rank", () => {
    expect(
      targetedShareGrants(
        { permission: "VIEW", sharedById: "owner", sharedWithId: "friend" },
        "friend",
        "COMMENT"
      )
    ).toBe(false);
  });
});

describe("tokenShareAllowsAccess", () => {
  const openView = {
    permission: "VIEW" as const,
    sharedById: "owner",
    sharedWithId: null,
    expiresAt: null,
  };

  it("allows open-link clone/comment when token is presented", () => {
    expect(tokenShareAllowsAccess(openView, "stranger", "VIEW")).toBe(true);
    expect(
      tokenShareAllowsAccess(
        { ...openView, permission: "COMMENT" },
        "stranger",
        "COMMENT"
      )
    ).toBe(true);
  });

  it("denies expired and wrong grantee", () => {
    expect(
      tokenShareAllowsAccess(
        { ...openView, expiresAt: new Date(Date.now() - 1000) },
        "stranger",
        "VIEW"
      )
    ).toBe(false);
    expect(
      tokenShareAllowsAccess(
        {
          permission: "VIEW",
          sharedById: "owner",
          sharedWithId: "friend",
          expiresAt: null,
        },
        "stranger",
        "VIEW"
      )
    ).toBe(false);
  });

  it("documents ambient vs token split for open COMMENT", () => {
    const openComment = {
      permission: "COMMENT" as const,
      sharedById: "owner",
      sharedWithId: null,
      expiresAt: null,
    };
    expect(targetedShareGrants(openComment, "stranger", "COMMENT")).toBe(false);
    expect(tokenShareAllowsAccess(openComment, "stranger", "COMMENT")).toBe(true);
  });
});
