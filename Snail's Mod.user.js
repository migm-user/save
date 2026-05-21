// ==UserScript==
// @name         Snail's Mod
// @namespace    O_"
// @version      1.2.1
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
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// ==/UserScript==

//이 모드는 Arie's Mod를 사용할 때, 업데이트로부터 자유로우면서 추가 옵션을 사용하고자 할 때 만들었습니다.

//★ 구매
(function () {
    'use strict';

    // 중복 실행 방지
    let isProcessing = false;

    function autoBuyAlertItems() {

        // 이미 실행 중이면 종료
        if (isProcessing) return;

        const alertIconBtn = document.querySelector(
            'button[aria-label="Notifications"]'
        );

        if (!alertIconBtn) return;

        const img = alertIconBtn.querySelector('img');

        // 안전하게 animation 검사
        const animation = img?.style?.animation || '';

        // 벨 안 흔들리면 종료
        if (!animation.includes('qwsBellShake')) return;

        isProcessing = true;

        console.log('🔔 알림 감지');

        // Notifications 열기
        alertIconBtn.click();

        setTimeout(() => {

            const dialog = document.querySelector(
                'div[role="dialog"][aria-label="Tracked items available"]'
            );

            if (!dialog) {

                console.log('❌ Dialog 못 찾음');

                alertIconBtn.click();
                isProcessing = false;
                return;

            }

            // Buy all 버튼 찾기
            const buyAllButtons = Array.from(
                dialog.querySelectorAll('button')
            ).filter(btn =>
                btn.innerText.trim().toLowerCase() === 'buy all'
            );

            // 버튼 클릭
            if (buyAllButtons.length > 0) {

                buyAllButtons.forEach(btn => {

                    if (!btn.disabled) {

                        btn.click();
                        console.log('✅ Buy all 클릭');

                    }

                });

            } else {

                console.log('❌ Buy all 없음');

            }

            // 창 닫기
            setTimeout(() => {

                alertIconBtn.click();
                console.log('📕 Notifications 닫기');

                isProcessing = false;

            }, 500);

        }, 500);
    }

    // 10초마다 검사
    setInterval(autoBuyAlertItems, 10000);

    console.log('🚀 Auto Buy Started');

})();
//요기가 끝
