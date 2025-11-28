/* ============================================================
   bulk.js – FINAL v2025
============================================================ */

function applyBulk() {

    const regexText = document.getElementById("bulk_regex").value.trim();
    let re = null;
    if (regexText) {
        try { re = new RegExp(regexText); } catch (e) {
            alert("정규식을 확인하세요.");
            return;
        }
    }

    /* 적용 대상 항목 */
    const applies = [...document.querySelectorAll(".apply")]
        .filter(chk => chk.checked)
        .map(chk => chk.dataset.target);

    window.__cols.forEach((col, i) => {

        if (re && !re.test(col.name)) return;

        applies.forEach(target => {

            switch (target) {

                case "hidden":
                    col.hidden = (document.querySelector("input[name='bulk_hidden']:checked").value === "true");
                    break;

                case "editable":
                    col.editable = (document.querySelector("input[name='bulk_editable']:checked").value === "true");
                    break;

                case "required":
                    col.editrules = col.editrules || {};
                    col.editrules.required =
                        (document.querySelector("input[name='bulk_required']:checked").value === "true");
                    break;

                case "width":
                    col.width = document.getElementById("bulk_width").value.trim();
                    break;

                case "align":
                    col.align = document.querySelector("input[name='bulk_align']:checked").value;
                    break;

                case "edittype":
                    col.edittype = document.querySelector("input[name='bulk_edittype']:checked")?.value || "";
                    break;

                case "editoptions":
                    col.editoptions = document.getElementById("bulk_editoptions").value.trim();
                    break;
            }
        });
    });

    /* ==============================
       렌더 → 다음 프레임에서 highlight → 다음 프레임에서 flash
       ============================== */

    window.render(window.__cols);

    requestAnimationFrame(() => {
        highlightUpdate();

        requestAnimationFrame(() => {
            const targets = document.querySelectorAll(".will-change");

            targets.forEach(td => {
                td.classList.remove("flash");
            });

            // 강제 리플로우 → 애니메이션 재시작 기능
            void document.body.offsetHeight;

            targets.forEach(td => {
                td.classList.add("flash");
            });
        });
    });


}
function playFlashEffect() {
    const targets = document.querySelectorAll(".will-change");

    targets.forEach(td => {
        td.classList.remove("cell-flash");
        void td.offsetWidth;               // 재적용 위해 강제 리플로우
        td.classList.add("cell-flash");
    });
}

// window.render(window.__cols);
// highlightUpdate();
// playFlashEffect();   // ← 이제 진짜 깜빡임 보임

