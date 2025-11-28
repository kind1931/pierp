/* ============================================================
   options-ui.js – FINAL v2025
============================================================ */

window.__cols = [];

const sqlInput = document.getElementById("sql");
const outArea = document.getElementById("out");
const tbody = document.querySelector("#colTable tbody");
const bulkRegex = document.getElementById("bulk_regex");

// ===========================================
//  디스클로저 + 로컬스토리지 DOM
// ===========================================
const bulkHeader = document.getElementById("bulk-toggle-header");
const bulkArea = document.getElementById("bulk-area");

// ===========================================
//  로컬스토리지 로드
// ===========================================
(function loadStorage() {
    disableBulkDisclosure();
    const saved = localStorage.getItem("gridGenData");
    if (!saved) return;

    const data = JSON.parse(saved);

    sqlInput.value = data.sql ?? "";

    if (data.cols) {
        window.__cols = data.cols;
        render(window.__cols);
        enableBulkDisclosure();
    }

    if (data.result) {
        outArea.value = data.result;
    }
})();

// ===========================================
//  저장 함수
// ===========================================
function saveStorage() {
    localStorage.setItem("gridGenData", JSON.stringify({
        sql: sqlInput.value.trim(),
        cols: window.__cols,
        result: outArea.value
    }));
}

// 초기화 버튼
document.getElementById("btn-reset-storage").addEventListener("click", () => {
    localStorage.removeItem("gridGenData");
    location.reload();
});

// ===========================================
//  디스클로저 enable/disable
// ===========================================
function enableBulkDisclosure() {
    bulkHeader.classList.remove("disabled");
}

function disableBulkDisclosure() {
    bulkHeader.classList.add("disabled");
    bulkArea.style.display = "none";
}
/* ------------------------------------------
   SQL PARSE
------------------------------------------- */
document.getElementById("btn-parse").addEventListener("click", () => {
    let sql = sqlInput.value.trim();
    if (!sql) return alert("SQL 입력하세요.");

    let cols = parseSQL(sql);

    if (document.getElementById("addStateFlag").checked) {
        cols.unshift({
            include: true,
            name: "stateFlag",
            cname: "상태",
            width: "30",
            align: "center",
            hidden: false,
            editable: false,
            edittype: "",
            editoptions: ""
        });
    }

    cols = cols.map(c => {
        const tr = tbody.querySelector(`tr[data-name='${c.name}']`);

        // UI 체크박스 상태 (값 없으면 false)
        const required = tr?.querySelector(".rule-required")?.checked ?? false;

        // editrules는 항상 생성
        const editrules = { required };

        return {
            include: true,
            name: c.name,
            cname: c.cname,
            width: c.width || "",
            align: c.align || "left",
            hidden: c.hidden || false,
            editable: c.editable || false,
            edittype: c.edittype || "",
            editoptions: c.editoptions || "",

            // 항상 존재해야 하므로 조건 없이 추가
            editrules
        };
    });


    window.__cols = cols;
    render(cols);

    // 파싱 후 일괄편집 활성화 + 저장
    enableBulkDisclosure();
    saveStorage();

});

/* ------------------------------------------
   RENDER
------------------------------------------- */
function render(cols) {
    tbody.innerHTML = "";

    cols.forEach((c, i) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><input type="checkbox" data-k="include" data-i="${i}" ${c.include ? "checked" : ""}></td>
            <td><input type="text" data-k="name" data-i="${i}" value="${c.name}"></td>
            <td><input type="text" data-k="cname" data-i="${i}" value="${c.cname}"></td>

            <td data-col="width">
                <input type="text" data-k="width" data-i="${i}" value="${c.width}" style="width:60px;">
            </td>

            <td data-col="align">
                <div class="align-group">
                    ${alignBtn("left", c.align, i)}
                    ${alignBtn("center", c.align, i)}
                    ${alignBtn("right", c.align, i)}
                </div>
            </td>

            <td data-col="hidden"><input type="checkbox" data-k="hidden" data-i="${i}" ${c.hidden ? "checked" : ""}></td>
            <td data-col="editable"><input type="checkbox" data-k="editable" data-i="${i}" ${c.editable ? "checked" : ""}></td>

            <!-- editrules.required -->
            <td data-col="required">
                <input type="checkbox"
                    class="rule-required"
                    data-k="required"
                    data-i="${i}"
                    ${c.editrules?.required ? "checked" : ""}>
            </td>

            <td data-col="edittype">
                <select data-k="edittype" data-i="${i}" class="edittype-select">
                    <option value=""></option>
                    <option value="text" ${c.edittype === "text" ? "selected" : ""}>text</option>
                    <option value="select" ${c.edittype === "select" ? "selected" : ""}>select</option>
                    <option value="date" ${c.edittype === "date" ? "selected" : ""}>date</option>
                    <option value="currency" ${c.edittype === "currency" ? "selected" : ""}>currency</option>
                    <option value="checkbox" ${c.edittype === "checkbox" ? "selected" : ""}>checkbox</option>
                </select>
            </td>

            <td data-col="editoptions">
                <div class="editoptions-wrap">
                    { value:
                    <input type="text"
                        class="editoptions-input"
                        data-k="editoptions"
                        data-i="${i}"
                        value="${escapeHtml(c.editoptions)}"
                        placeholder='<pierp:gs cid="HR000" first="선택"/>'>
                    }
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    highlightUpdate();
    outArea.value = formatAsJsLines(cols);

    // 매 렌더링마다 저장
    saveStorage();
}

/* ----------------------------------------------------------------------------------
   ALIGN BUTTON
---------------------------------------------------------------------------------- */
function alignBtn(val, current, i) {
    const checked = (val === current) ? "checked" : "";
    return `
        <label class="btn-radio">
            <input type="radio" data-k="align" data-i="${i}" value="${val}" ${checked}>
            <span>${val}</span>
        </label>
    `;
}

/* ----------------------------------------------------------------------------------
   INPUT EVENT HANDLING
---------------------------------------------------------------------------------- */
// 🔹 key 입력 중에는 render() 금지 — 값만 업데이트 + 결과만 갱신
document.addEventListener("input", e => {
    const k = e.target.dataset.k;
    if (!k) return;

    const i = Number(e.target.dataset.i);
    const col = window.__cols[i];

    if (!col) return;

    if (e.target.classList.contains("editoptions-input")) {
        col.editoptions = e.target.value.trim();
    } else if (e.target.type === "checkbox") {
        if (k === "required") {
            col.editrules = col.editrules || {};
            col.editrules.required = e.target.checked;
        } else {
            col[k] = !!e.target.checked;
        }
    } else {
        col[k] = e.target.value.trim();
    }

    // 결과값만 갱신 (렌더 금지)
    outArea.value = formatAsJsLines(window.__cols);
    saveStorage();
});

// 🔹 체크박스, 셀렉트 변경 시에는 render() 필요
document.addEventListener("change", e => {
    const k = e.target.dataset.k;
    if (!k) return;

    const i = Number(e.target.dataset.i);
    const col = window.__cols[i];
    if (!col) return;

    if (e.target.type === "checkbox") {
        if (k === "required") {
            col.editrules = col.editrules || {};
            col.editrules.required = e.target.checked;
        } else {
            col[k] = e.target.checked;
        }
    } else {
        col[k] = e.target.value.trim();
    }

    // render 허용 — UI 구조 새로 만들어야 하는 경우
    render(window.__cols);
});

/* align click */
document.addEventListener("click", e => {
    if (e.target.matches(".btn-radio span")) {
        const input = e.target.previousElementSibling;
        input.checked = true;
        const i = Number(input.dataset.i);
        window.__cols[i].align = input.value;
        render(window.__cols);
    }
});

/* editoptions placeholder */
document.addEventListener("focusin", e => {
    if (e.target.classList.contains("editoptions-input")) {
        if (!e.target.value.trim()) {
            e.target.value = `<pierp:gs cid="HR000" first="선택"/>`;
        }
    }
});

document.addEventListener("focusout", e => {
    if (e.target.classList.contains("editoptions-input")) {
        const v = e.target.value.trim();
        const def = `<pierp:gs cid="HR000" first="선택"/>`;
        if (v === def) e.target.value = "";
    }
});

/* ----------------------------------------------------------------------------------
   정규식 입력 즉시 반영
---------------------------------------------------------------------------------- */
bulkRegex.addEventListener("input", () => highlightUpdate());

// ===========================================
//  디스클로저 toggle
// ===========================================
bulkHeader.addEventListener("click", () => {
    if (bulkHeader.classList.contains("disabled")) return;

    const isClosed = bulkArea.style.display === "none";
    bulkArea.style.display = isClosed ? "block" : "none";

    bulkHeader.textContent = isClosed ? "▾ 일괄편집" : "▸ 일괄편집";

    saveStorage();
});


/* ==================================================================================
   highlightUpdate() – 최종 로직
   (Bulk Table, Column Table, Column Header, 색상 모두 처리)
================================================================================== */
function highlightUpdate() {

    /* 선택된 적용 항목 */
    const applies = [...document.querySelectorAll(".apply")]
        .filter(chk => chk.checked)
        .map(chk => chk.dataset.target);

    /* -------------------------
       Bulk Table highlight
    --------------------------*/
    document.querySelectorAll(".bulk-table tbody tr").forEach(tr =>
        tr.classList.remove("bulk-row-change"));

    applies.forEach(target => {
        const chk = document.querySelector(`.apply[data-target='${target}']`);
        if (chk) chk.closest("tr").classList.add("bulk-row-change");
    });

    /* -------------------------
       Column Table 초기화
    --------------------------*/
    tbody.querySelectorAll("tr").forEach(tr =>
        tr.classList.remove("match-row"));
    tbody.querySelectorAll("td").forEach(td =>
        td.classList.remove("will-change"));

    document.querySelectorAll("#colTable thead th").forEach(th =>
        th.classList.remove("col-change"));

    /* -------------------------
       정규식
    --------------------------*/
    const regexText = bulkRegex.value.trim();
    let re = null;
    if (regexText) {
        try { re = new RegExp(regexText); } catch (e) { }
    } else if (!re) {
        // 정규식 없음 → 전체 적용 highlight
        const ths = document.querySelectorAll("#colTable thead th");

        window.__cols.forEach((col, i) => {
            const tr = tbody.querySelectorAll("tr")[i];
            tr.classList.add("match-row");

            applies.forEach(target => {
                const td = tr.querySelector(`td[data-col='${target}']`);
                if (td) {
                    td.classList.add("will-change");

                    const colIndex = [...tr.children].indexOf(td);
                    if (colIndex >= 0) ths[colIndex].classList.add("col-change");
                }
            });
        });

        return;
    }


    const ths = document.querySelectorAll("#colTable thead th");

    /* -------------------------
       colTable highlight
    --------------------------*/
    window.__cols.forEach((col, i) => {
        if (!re.test(col.name)) return;

        const tr = tbody.querySelectorAll("tr")[i];
        tr.classList.add("match-row");

        applies.forEach(target => {
            const td = tr.querySelector(`td[data-col='${target}']`);
            if (td) {
                td.classList.add("will-change");

                const colIndex = [...tr.children].indexOf(td);
                if (colIndex >= 0) ths[colIndex].classList.add("col-change");
            }
        });
    });
}

/* 적용 체크박스 change 시 즉시 업데이트 */
document.querySelectorAll(".apply").forEach(chk => {
    chk.addEventListener("change", () => {
        highlightUpdate();
    });
});


/* ==================================================================================
   formatAsJsLines
================================================================================== */
function visualLength(str) {
    let len = 0;
    for (const ch of str) {
        if (/[가-힣]/.test(ch)) len += 1.4;
        else len += 1;
    }
    return len;
}

function formatAsJsLines(cols) {

    const list = cols.filter(c => c.include);

    const maxName = Math.max(...list.map(c => c.name.length));
    const maxCname = Math.max(...list.map(c => visualLength(c.cname.trim())));
    const padSpaces = (vis, max) => " ".repeat(Math.max(0, Math.round(max - vis) + 2));

    let out = "var cmodels = [\n";

    list.forEach((c, idx) => {
        out += "  {";
        const nameStr = c.name;
        const cnameStr = c.cname.trim();

        const cnameVis = visualLength(cnameStr);

        out += `  {name:'${nameStr}',` + padSpaces(nameStr.length, maxName);
        out += `cname:'${cnameStr}',` + padSpaces(cnameVis, maxCname);

        out += `width:'${c.width}', `;
        out += `align:'${c.align}', `;
        out += `hidden:${c.hidden}, `;
        out += `editable:${c.editable}`;
        if (c.editrules) {
            out += `, editrules:{required:${c.editrules.required}}`;
        }
        if (c.edittype) out += `, edittype:'${c.edittype}'`;
        if (c.editoptions) out += `, editoptions:{value:${c.editoptions}}`;
        out += "}";
        if (idx < list.length - 1) out += ",";
        out += "\n";
    });

    out += "];";
    return out;
}


function escapeHtml(str) {
    return str.replace(/"/g, "&quot;");
}

window.render = render;
window.formatAsJsLines = formatAsJsLines;

// 적용 체크박스 클릭 즉시 반영
document.addEventListener("change", (e) => {
    const td = e.target.closest("td");
    if (!td) return;

    td.classList.remove("cell-change-flash");
    void td.offsetWidth;  // reflow 트릭
    td.classList.add("cell-change-flash");
});