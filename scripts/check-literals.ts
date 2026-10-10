// Build check 10: no file under src/app or src/components contains a canonical value of
// 10 or more (with or without thousands separators) in JSX text or a string literal.
// className, style and numeric layout props are not scanned.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export interface LiteralViolation {
  file: string;
  line: number;
  text: string;
  value: number;
}

const SKIP_ATTRS = new Set([
  "className", "style", "viewBox", "d", "points", "transform", "width", "height", "x", "y", "x1", "x2", "y1", "y2",
  "cx", "cy", "r", "rx", "ry", "dx", "dy", "fill", "stroke", "strokeWidth", "strokeDasharray", "href", "id", "key",
  "data-testid", "htmlFor", "type", "rel", "target", "sizes", "media", "lang", "role",
]);

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function numbersIn(text: string): number[] {
  const out: number[] = [];
  const re = /(?<![\w.#-])(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(Number(m[1]!.replace(/,/g, "")));
  return out;
}

export function checkLiterals(roots: string[], canonical: number[]): LiteralViolation[] {
  const watch = new Set(canonical.filter((v) => Number.isInteger(v) && v >= 10));
  const violations: LiteralViolation[] = [];
  for (const root of roots) {
    for (const file of listFiles(root)) {
      const source = readFileSync(file, "utf8");
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (node: ts.Node) => {
        let text: string | null = null;
        if (ts.isJsxText(node)) text = node.getText(sf);
        else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
          const attr = node.parent && ts.isJsxAttribute(node.parent) ? node.parent : node.parent?.parent && ts.isJsxAttribute(node.parent.parent) ? node.parent.parent : null;
          const attrName = attr ? attr.name.getText(sf) : null;
          const inImport = ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent);
          if (!inImport && !(attrName && SKIP_ATTRS.has(attrName))) text = node.text;
        }
        if (text) {
          for (const v of numbersIn(text)) {
            if (watch.has(v)) {
              violations.push({ file: path.relative(process.cwd(), file), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: text.trim().slice(0, 80), value: v });
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
  }
  return violations;
}

// CLI: `npm run check-literals`
const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join("scripts", "check-literals.ts"));
if (isMain) {
  void (async () => {
    const { buildBundle } = await import("../src/data/build");
    const bundle = buildBundle(path.join(process.cwd(), "data"));
    const values = Object.values(bundle.metrics).map((m) => m.value).filter((v): v is number => typeof v === "number");
    const v = checkLiterals([path.join(process.cwd(), "src/app"), path.join(process.cwd(), "src/components")], values);
    if (v.length) {
      for (const x of v) console.error(`  ${x.file}:${x.line}  ${x.value}  "${x.text}"`);
      console.error(`[check-literals] FAIL: ${v.length} hard-coded canonical value(s)`);
      process.exit(1);
    }
    console.log("[check-literals] PASS: no canonical value of 10 or more is hard-coded in src/app or src/components");
  })();
}
