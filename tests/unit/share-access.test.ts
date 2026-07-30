import { describe, expect, it } from "vitest";
import { permissionAtLeast } from "@/lib/permissions/share-access";

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
