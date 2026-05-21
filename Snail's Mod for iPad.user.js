// ==UserScript==
// @name         Snail's Mod for iPad
// @namespace    O_"
// @version      1.2.0
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
// @description  o.o_b
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod%20for%20iPad.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod%20for%20iPad.user.js
// ==/UserScript==

//이 모드는 Arie's Mod를 사용할 때, 업데이트로부터 자유로우면서 추가 옵션을 사용하고자 할 때 만들었습니다.

//★ 구매
(function() {
    'use strict';

    // ==========================================
    // 자동 구매 로직
    // ==========================================
    function autoBuyAlertItems() {
        const alertIconSelector = 'button[aria-label="Notifications"]';
        const alertIconBtn = document.querySelector(alertIconSelector);

        if (alertIconBtn) {
            const img = alertIconBtn.querySelector('img');
            const isRinging = img && img.style.animation.includes('qwsBellShake');

            if (isRinging) {
                alertIconBtn.click();
                setTimeout(() => {
                    const dialog = document.querySelector('div[role="dialog"][aria-label="Tracked items available"]');
                    if (dialog) {
                        const buttons = Array.from(dialog.querySelectorAll('button'));
                        const buyAllButtons = buttons.filter(btn => btn.innerText.trim().toLowerCase() === 'buy all');

                        if (buyAllButtons.length > 0) {
                            buyAllButtons.forEach(btn => btn.click());
                            setTimeout(() => alertIconBtn.click(), 500);
                        } else {
                            alertIconBtn.click();
                        }
                    } else {
                        alertIconBtn.click();
                    }
                }, 500);
            }
        }
    }
    setInterval(autoBuyAlertItems, 10000);

})();
//요기가 끝

//Alt X 들어올때마다 한번씩 눌러주기
setTimeout(() => {
    ['keydown', 'keyup'].forEach(type => {
        document.dispatchEvent(new KeyboardEvent(type, {
            key: 'x',
            code: 'KeyX',
            altKey: true,
            bubbles: true
        }));
    });
}, 5000);
//요기가 끝
