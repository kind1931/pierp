/* ============================================================
   SQL COLUMN PARSER – FINAL STABLE FULL VERSION
   (주석/alias 보존 → split → mask → camelCase)
   ============================================================ */

function parseSQL(sql) {
  if (!sql) return [];

  // 1) -- 라인 주석 제거
  sql = sql.replace(/--.*$/gm, "");

  // 2) SELECT ~ FROM 추출
  const up = sql.toUpperCase();
  const fi = up.indexOf(" FROM ");
  let core = fi >= 0 ? sql.substring(0, fi) : sql;
  core = core.replace(/^\s*SELECT\s+/i, "").trim();

  // 3) 컬럼 리스트 정확하게 분리 (/*주석*/ 포함)
  let rawCols = splitColumnsAccurate(core);

  // 4) 컬럼별 초기 정보 정리(주석+cname+alias 최초 추출)
  let cols = rawCols.map(expr => extractInitial(expr));

  // 5) CASE / 괄호 전체 치환 (alias는 이미 확보됨)
  cols = cols.map(c => ({
    ...c,
    masked: maskParenthesesWhole(maskCaseExpressions(c.cleanedExpr))
  }));

  // 6) 최종 name/cname 생성
  return cols.map(c => finalizeColumn(c));
}


/* ============================================================
   (1) 컬럼을 정확하게 분리하기 위한 splitColumnsAccurate
   - 주석, 괄호, 문자열, 모두 안전 처리
   ============================================================ */
function splitColumnsAccurate(str) {
  const cols = [];
  let cur = "";
  let depth = 0;
  let inComment = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = str[i + 1];

    // /* 주석 시작 */
    if (!inComment && ch === "/" && next === "*") {
      inComment = true;
      cur += "/*";
      i++;
      continue;
    }

    // */ 주석 끝
    if (inComment && ch === "*" && next === "/") {
      inComment = false;
      cur += "*/";
      i++;
      continue;
    }

    if (inComment) {
      cur += ch;
      continue;
    }

    // 괄호 depth 계산
    if (ch === "(") depth++;
    if (ch === ")") depth--;

    // depth=0 콤마가 "컬럼 구분자"
    if (ch === "," && depth === 0) {
      if (cur.trim()) cols.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  if (cur.trim()) cols.push(cur.trim());
  return cols;
}


/* ============================================================
   (2) CASE WHEN … END 전체 치환 → X
   ============================================================ */
function maskCaseExpressions(str) {
  let out = "";
  let up = str.toUpperCase();
  let i = 0;

  while (i < str.length) {
    if (up.startsWith("CASE", i)) {
      let depth = 0;
      let j = i;

      while (j < str.length) {
        if (up.startsWith("CASE", j)) depth++;
        if (up.startsWith("END", j)) {
          depth--;
          if (depth === 0) {
            j += 3;
            break;
          }
        }
        j++;
      }
      out += "X"; // CASE 전체를 X로
      i = j;
      continue;
    }

    out += str[i];
    i++;
  }
  return out;
}


/* ============================================================
   (3) 괄호 전체 치환 → X
   ============================================================ */
function maskParenthesesWhole(str) {
  let out = "";
  let depth = 0;

  for (let ch of str) {
    if (ch === "(") {
      depth++;
      if (depth === 1) out += "X"; // 첫 여는 괄호 자리에 X 한 번
      continue;
    }
    if (ch === ")") {
      depth--;
      continue;
    }
    if (depth === 0) out += ch;
  }
  return out;
}


/* ============================================================
   (4) 컬럼별 초기 정리: cname / alias 추출
   ============================================================ */
function extractInitial(expr) {
  let col = expr.trim();
  let cname = null;

  // cname 주석 추출
  const cm = col.match(/\/\*([^*]+)\*\//);
  if (cm) {
    cname = cm[1].trim();
    col = col.replace(/\/\*[^*]+\*\//, "").trim();
  }

  // AS alias
  let asM = col.match(/\bAS\s+([A-Za-z0-9_]+)/i);
  if (asM) {
    return {
      rawAlias: asM[1],
      cleanedExpr: col.replace(/\bAS\s+[A-Za-z0-9_]+/i, "").trim(),
      cname
    };
  }

  // 공백 alias
  let parts = col.split(/\s+/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(last)) {
      const cleaned = col.substring(0, col.lastIndexOf(last)).trim();
      return {
        rawAlias: last,
        cleanedExpr: cleaned,
        cname
      };
    }
  }

  return {
    rawAlias: null,
    cleanedExpr: col,
    cname
  };
}


/* ============================================================
   (5) camelCase 변환
   ============================================================ */
function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}


/* ============================================================
   (6) 최종 컬럼 생성
   ============================================================ */
function finalizeColumn(col) {
  if (col.rawAlias) {
    return {
      name: toCamelCase(col.rawAlias),
      cname: col.cname || col.rawAlias
    };
  }

  // alias 없는 경우: masked expr 마지막 식별자 사용
  let t = col.masked.trim();

  // table.col → col
  const tokens = t.split(".");
  t = tokens[tokens.length - 1].replace(/[^A-Za-z0-9_]/g, "");

  if (!t)
    t = "col" + Math.random().toString(36).slice(2, 6);

  return {
    name: toCamelCase(t),
    cname: col.cname || t
  };
}
