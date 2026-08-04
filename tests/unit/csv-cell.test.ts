import { describe, it, expect } from "vitest";
import { csvCell } from "@/lib/geo/export";

describe("csvCell", () => {
  it("leaves ordinary values untouched", () => {
    expect(csvCell("מפל הבניאס")).toBe("מפל הבניאס");
    expect(csvCell("")).toBe("");
  });

  it("quotes cells containing a comma, quote or newline", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("carriage\rreturn")).toBe('"carriage\rreturn"');
  });

  it('doubles embedded quotes per RFC 4180, not backslash-escapes them', () => {
    // JSON.stringify produced \" here, which every spreadsheet misparses —
    // the row silently shifts by a column from that cell onward.
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell('He said "hi"')).not.toContain('\\"');
  });

  it("defuses formula-leading cells", () => {
    // These execute on open in Excel/Sheets. Titles can arrive from an import
    // or a collaborator, so the person opening the file is not necessarily the
    // person who chose the text.
    for (const dangerous of ["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"]) {
      const cell = csvCell(dangerous);
      // A defused cell may also need RFC-4180 quoting (\r does), so compare
      // the cell's content rather than its first character.
      const content = cell.startsWith('"') ? cell.slice(1, -1) : cell;
      expect(content.startsWith("'")).toBe(true);
    }
  });

  it("quotes a defused cell that also needs quoting", () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""x"")"'
    );
  });

  it("does not defuse a value that merely contains an operator", () => {
    expect(csvCell("Ein Gedi = the best")).toBe("Ein Gedi = the best");
    expect(csvCell("2+2 pools")).toBe("2+2 pools");
  });
});
