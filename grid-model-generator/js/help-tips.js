class HelpTip extends HTMLElement {
    connectedCallback() {
        // slot 대신 수동으로 저장
        const content = this.innerHTML;

        // 기본 방향 = bottom-right
        let direction = "";

        // 사용자 속성 전달
        if (this.hasAttribute("left-bottom")) direction = "tooltip-left-bottom";

        // 템플릿 삽입
        this.innerHTML = `
            <div class="help-wrapper">
                <div class="help-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#999" stroke-width="2" />
                        <path d="M9.8 9a2.2 2.2 0 114.4 0c0 1.8-2.2 1.5-2.2 3v1"
                            stroke="#999" stroke-width="2" stroke-linecap="round" />
                        <circle cx="12" cy="16" r="1" fill="#999" />
                    </svg>
                </div>
                <div class="help-tooltip ${direction}">
                </div>
            </div>
        `;

        // slot 동작처럼 내부에 박아넣기
        this.querySelector(".help-tooltip").innerHTML = content;
    }
}

customElements.define("help-tip", HelpTip);
