// ==UserScript==
// @name         Snail's Mod
// @namespace    O_"
// @author       O_"
// @version      1.4.41
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
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
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

    const SIZE = 44;
    const GAP = 8;
    const Z_INDEX = 1999899;
    const MARGIN = 16;
    const STORAGE_KEY = 'mg_quick_tools_pos';

    // 중복 생성 방지
    if (document.getElementById('mg-quick-tools')) return;

    function createButton(icon, title, onClick) {
        const btn = document.createElement('button');

        Object.assign(btn.style, {
            width: `${SIZE}px`,
            height: `${SIZE}px`,
            borderRadius: '50%',
            border: '1px solid #32404e',
            background: 'linear-gradient(180deg, #111923, #0b131c)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
            color: '#fff',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            touchAction: 'none'
        });

        btn.textContent = icon;
        btn.title = title;
        btn.setAttribute('aria-label', title);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });

        return btn;
    }

    const container = document.createElement('div');
    container.id = 'mg-quick-tools';

    Object.assign(container.style, {
        position: 'fixed',
        right: `${MARGIN}px`,
        top: '35%',
        display: 'flex',
        flexDirection: 'column',
        gap: `${GAP}px`,
        zIndex: String(Z_INDEX),
        userSelect: 'none',
        touchAction: 'none'
    });

    const refreshBtn = createButton('🔄', 'Refresh Page', () => {
        console.log('[QuickTools] Page Reload');
        location.reload();
    });

    const altXBtn = createButton('⚙️', 'Alt + X', () => {
        console.log('[QuickTools] Alt+X');

        const down = new KeyboardEvent('keydown', {
            key: 'x',
            code: 'KeyX',
            altKey: true,
            bubbles: true,
            cancelable: true
        });

        const up = new KeyboardEvent('keyup', {
            key: 'x',
            code: 'KeyX',
            altKey: true,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(down);
        window.dispatchEvent(down);

        setTimeout(() => {
            document.dispatchEvent(up);
            window.dispatchEvent(up);
        }, 50);
    });

    container.append(refreshBtn, altXBtn);
    document.body.appendChild(container);

    // 저장된 위치 불러오기
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
            container.style.left = `${saved.left}px`;
            container.style.top = `${saved.top}px`;
            container.style.right = 'auto';
        }
    } catch {}

    // 드래그
    let drag = null;

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    container.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;

        const rect = container.getBoundingClientRect();

        drag = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            left: rect.left,
            top: rect.top,
            moved: false
        };

        container.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    container.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;

        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        if (Math.hypot(dx, dy) > 4) drag.moved = true;

        const left = clamp(
            drag.left + dx,
            8,
            window.innerWidth - container.offsetWidth - 8
        );

        const top = clamp(
            drag.top + dy,
            8,
            window.innerHeight - container.offsetHeight - 8
        );

        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
        container.style.right = 'auto';
    });

    function stopDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;

        try {
            container.releasePointerCapture(drag.id);
        } catch {}

        const rect = container.getBoundingClientRect();

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                left: Math.round(rect.left),
                top: Math.round(rect.top)
            })
        );

        drag = null;
    }

    container.addEventListener('pointerup', stopDrag);
    container.addEventListener('pointercancel', stopDrag);

    console.log('[QuickTools] Loaded');
})();
