// ==UserScript==
// @name         Snail's Mod
// @namespace    O_"
// @version      1.4.1
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
const INTERVAL = 60000;

let autoBuying = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clickNotificationBell() {
    const bell = document.querySelector('button[data-notification-bell-widget="1"]');
    if (!bell) return false;

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

        // Bell 열기
        if (!clickNotificationBell()) {
            console.log("🔔 Floating Bell 없음");
            return;
        }

        // Buy all 버튼 생성 대기
        let buttons = [];

        for (let i = 0; i < 15; i++) {
            await sleep(100);
            buttons = getBuyAllButtons();
            if (buttons.length) break;
        }

        if (buttons.length) {

            console.log(`🛒 Buy all ${buttons.length}개`);

            for (const btn of buttons) {
                btn.click();
            }

            await sleep(500);

        } else {

            console.log("구매할 상품 없음");

        }

        // Bell 닫기
        clickNotificationBell();

    } catch (e) {

        console.error(e);

    } finally {

        autoBuying = false;

    }
}

setTimeout(autoBuy, FIRST_DELAY);
setInterval(autoBuy, INTERVAL);

//요기가 끝
