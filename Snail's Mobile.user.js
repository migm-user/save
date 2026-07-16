// ==UserScript==
// @name         Snail's Mobile
// @namespace    O_"
// @author       O_"
// @version      1.1.1
// @match        https://1227719606223765687.discordsays.com/*
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @match        https://ariesmod-api.ariedam.fr/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_download
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @connect      ariesmod-api.ariedam.fr
// @connect      mg-api.ariedam.fr
// @connect      ariedam.fr
// @connect      cdn.pixabay.com
// @connect      cdn.jsdelivr.net
// @connect      magicgarden.gg
// @connect      i.imgur.com
// @connect      cdn.discordapp.com
// @description  o.o_b & junhwan Made
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mobile.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mobile.user.js
// ==/UserScript==

//★ 자동 구매

const FIRST_DELAY = 10000;
const CHECK_INTERVAL = 60000;

let autoBuying = false;
let bellWarningShown = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clickNotificationBell() {

    const bell = document.querySelector(
        'button[data-notification-bell-widget="1"]'
    );

    if (!bell) {

        if (!bellWarningShown) {

            bellWarningShown = true;

            alert(
`이 메세지는 Snail's Mod 사용자에게 전송 되는 것입니다.
자동으로 구매를 하기 위해 필요한 Floating Bell을 찾을 수 없습니다.

Alerts → Settings → Floating bell [On]

으로 설정한 후 다시 시도하세요.`
            );

        }

        return false;
    }

    bellWarningShown = false;

    const r = bell.getBoundingClientRect();

    bell.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2
    }));

    document.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2
    }));

    return true;
}

function getBuyAllButtons() {

    return [...document.querySelectorAll("button")].filter(btn =>
        btn.isConnected &&
        !btn.disabled &&
        btn.offsetParent !== null &&
        btn.textContent.trim() === "Buy all"
    );

}

async function autoBuy() {

    if (autoBuying) return;

    autoBuying = true;

    try {

        console.log("[AutoBuy] 검사 시작");

        // Bell 열기
        if (!clickNotificationBell()) return;

        // Buy all 버튼 대기 (최대 1.5초)
        let buttons = [];

        for (let i = 0; i < 15; i++) {

            await sleep(100);

            buttons = getBuyAllButtons();

            if (buttons.length) break;
        }

        if (buttons.length) {

            console.log(`[AutoBuy] Buy all ${buttons.length}개`);

            for (const btn of buttons) {

                try {
                    btn.click();
                } catch (e) {
                    console.warn(e);
                }

            }

            // 구매 처리 대기
            await sleep(500);

        } else {

            console.log("[AutoBuy] 구매 가능한 상품 없음");

        }

        // Bell 닫기
        clickNotificationBell();

    } catch (e) {

        console.error("[AutoBuy]", e);

    } finally {

        autoBuying = false;

    }

}

console.log("[AutoBuy] 시작");

setTimeout(autoBuy, FIRST_DELAY);
setInterval(autoBuy, CHECK_INTERVAL);
//요기가 끝

//요기가 버튼의 시작
(function () {
    'use strict';

    const BUTTON_SIZE = 44;
    const GAP = 8;
    const STORAGE_KEY = "quick-tools-position";

    function createButton(icon, title, onClick) {

        const btn = document.createElement("button");

        btn.type = "button";
        btn.title = title;

        Object.assign(btn.style, {
            position: "fixed",
            width: BUTTON_SIZE + "px",
            height: BUTTON_SIZE + "px",
            zIndex: 1999901,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid #32404e",
            background: "linear-gradient(180deg,#111923,#0b131c)",
            boxShadow: "0 10px 28px rgba(0,0,0,.45)",
            color: "#fff",
            fontSize: "22px",
            cursor: "grab",
            userSelect: "none",
            touchAction: "none"
        });

        btn.textContent = icon;

        let drag = null;

        btn.addEventListener("pointerdown", e => {

            if (e.button !== 0) return;

            const rect = btn.getBoundingClientRect();

            drag = {
                startX: e.clientX,
                startY: e.clientY,
                left: rect.left,
                top: rect.top,
                moved: false
            };

            btn.setPointerCapture(e.pointerId);
            btn.style.cursor = "grabbing";
        });

        btn.addEventListener("pointermove", e => {

            if (!drag) return;

            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3)
                drag.moved = true;

            btn.style.left = drag.left + dx + "px";
            btn.style.top = drag.top + dy + "px";
        });

        btn.addEventListener("pointerup", e => {

            if (!drag) return;

            btn.style.cursor = "grab";

            if (!drag.moved) {
                onClick();
            }

            savePositions();

            drag = null;
        });

        document.body.appendChild(btn);

        return btn;
    }

    const refreshBtn = createButton(
        "🔄",
        "Refresh Page",
        () => location.reload()
    );

    const altXBtn = createButton(
        "⚙️",
        "Send Alt+X",
        () => {

            window.dispatchEvent(new KeyboardEvent("keydown", {
                key: "x",
                code: "KeyX",
                altKey: true,
                bubbles: true
            }));

            window.dispatchEvent(new KeyboardEvent("keyup", {
                key: "x",
                code: "KeyX",
                altKey: true,
                bubbles: true
            }));

            console.log("Alt+X sent");
        }
    );

    function setDefaultPositions() {

        const right = 20;

        refreshBtn.style.left =
            window.innerWidth - BUTTON_SIZE - right + "px";

        refreshBtn.style.top = "250px";

        altXBtn.style.left =
            window.innerWidth - BUTTON_SIZE - right + "px";

        altXBtn.style.top =
            250 + BUTTON_SIZE + GAP + "px";
    }

    function savePositions() {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                refresh: {
                    left: refreshBtn.style.left,
                    top: refreshBtn.style.top
                },
                altx: {
                    left: altXBtn.style.left,
                    top: altXBtn.style.top
                }
            })
        );
    }

    function loadPositions() {

        try {

            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

            if (!saved) {
                setDefaultPositions();
                return;
            }

            refreshBtn.style.left = saved.refresh.left;
            refreshBtn.style.top = saved.refresh.top;

            altXBtn.style.left = saved.altx.left;
            altXBtn.style.top = saved.altx.top;

        } catch {

            setDefaultPositions();
        }
    }

    loadPositions();

})();
