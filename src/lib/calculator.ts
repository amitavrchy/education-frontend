/**
 * Safe scientific-expression evaluator (recursive descent; no eval/Function).
 * Supports + − × ÷ ^ %, parentheses, unary minus, implicit multiplication (2π, 3(4)),
 * functions sin cos tan asin acos atan sqrt cbrt abs log (base 10) ln exp fact, constants π/pi e.
 */
export type AngleMode = "deg" | "rad";

const FUNCS = ["sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "cbrt", "abs", "log", "ln", "exp", "fact"] as const;

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error("factorial needs a non-negative integer");
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function evaluate(expr: string, mode: AngleMode = "deg"): number {
  const src = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/\s+/g, "");
  let i = 0;
  const toRad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);

  const peek = () => src[i];
  const eat = (c: string) => {
    if (src[i] === c) {
      i++;
      return true;
    }
    return false;
  };

  function number(): number {
    const start = i;
    while (i < src.length && /[0-9.]/.test(src[i])) i++;
    if (start === i) throw new Error(`Unexpected '${src[i] ?? "end"}'`);
    const v = Number(src.slice(start, i));
    if (Number.isNaN(v)) throw new Error("Invalid number");
    return v;
  }

  function primary(): number {
    if (eat("(")) {
      const v = expression();
      if (!eat(")")) throw new Error("Missing ')'");
      return v;
    }
    const rest = src.slice(i);
    for (const fn of FUNCS) {
      if (rest.startsWith(fn) && rest[fn.length] === "(") {
        i += fn.length + 1;
        const a = expression();
        if (!eat(")")) throw new Error("Missing ')'");
        switch (fn) {
          case "sin": return Math.sin(toRad(a));
          case "cos": return Math.cos(toRad(a));
          case "tan": return Math.tan(toRad(a));
          case "asin": return fromRad(Math.asin(a));
          case "acos": return fromRad(Math.acos(a));
          case "atan": return fromRad(Math.atan(a));
          case "sqrt": if (a < 0) throw new Error("√ of a negative number"); return Math.sqrt(a);
          case "cbrt": return Math.cbrt(a);
          case "abs": return Math.abs(a);
          case "log": if (a <= 0) throw new Error("log needs a positive number"); return Math.log10(a);
          case "ln": if (a <= 0) throw new Error("ln needs a positive number"); return Math.log(a);
          case "exp": return Math.exp(a);
          case "fact": return factorial(a);
        }
      }
    }
    if (rest.startsWith("pi")) {
      i += 2;
      return Math.PI;
    }
    if (rest.startsWith("e") && !/[a-z]/.test(rest[1] ?? "")) {
      i += 1;
      return Math.E;
    }
    return number();
  }

  function postfix(): number {
    let v = primary();
    while (true) {
      if (eat("!")) v = factorial(v);
      else if (eat("%")) v = v / 100;
      else break;
    }
    return v;
  }

  function unary(): number {
    if (eat("-")) return -unary();
    if (eat("+")) return unary();
    return power();
  }

  function power(): number {
    const base = postfix();
    if (eat("^")) return Math.pow(base, unary()); // right-associative
    return base;
  }

  function term(): number {
    let v = unary();
    while (i < src.length) {
      if (eat("*")) v *= unary();
      else if (eat("/")) {
        const d = unary();
        if (d === 0) throw new Error("Division by zero");
        v /= d;
      } else if (peek() === "(" || /[a-z0-9.]/.test(peek() ?? "")) v *= unary(); // implicit ×
      else break;
    }
    return v;
  }

  function expression(): number {
    let v = term();
    while (i < src.length) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else break;
    }
    return v;
  }

  if (!src) throw new Error("Empty expression");
  const result = expression();
  if (i < src.length) throw new Error(`Unexpected '${src[i]}'`);
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return Math.abs(result) < 1e-12 ? 0 : result;
}

export function formatResult(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return Number(v.toPrecision(12)).toString();
}
