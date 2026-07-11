// ==UserScript==
// @name         Snail's Mod
// @namespace    O_"
// @version      1.3.1
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
// @description  o.o_b & junhwan
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// ==/UserScript==

(function () {
    'use strict';

    const FIRST_RUN_DELAY = 10000;
    const REPEAT_INTERVAL = 120000;

    const BELL_LABEL = 'GeminiNotificationBell';

    const BELL_TIMEOUT = 30000;
    const BUTTON_TIMEOUT = 5000;

    let running = false;
    let cachedBell = null;

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    function pageWin() {
        try {
            return unsafeWindow || window;
        } catch {
            return window;
        }
    }

    function getState() {
        const w = pageWin();

        return (
            w.__MG_SPRITE_STATE__ ||
            window.__MG_SPRITE_STATE__ ||
            null
        );
    }

    function getStage(state) {
        if (!state) return null;

        return (
            state.app?.stage ||
            state.renderer?.stage ||
            state.renderer?.lastObjectRendered ||
            null
        );
    }

    function getCanvas(state) {
        if (!state) return null;

        const renderer =
            state.renderer ||
            state.app?.renderer;

        if (!renderer) return null;

        return (
            renderer.canvas ||
            renderer.view?.canvas ||
            renderer.view ||
            null
        );
    }

    function findLabel(root, label) {
        if (!root) return null;

        const stack = [root];

        while (stack.length) {
            const node = stack.pop();

            if (!node) continue;

            if (
                node.label === label ||
                node.name === label
            ) {
                return node;
            }

            if (Array.isArray(node.children)) {
                for (const child of node.children) {
                    stack.push(child);
                }
            }
        }

        return null;
    }

    async function getBell() {

        if (
            cachedBell &&
            !cachedBell.destroyed
        ) {
            return cachedBell;
        }

        const start = Date.now();

        while (
            Date.now() - start <
            BELL_TIMEOUT
        ) {
            const state = getState();
            const stage = getStage(state);

            const bell =
                findLabel(
                    stage,
                    BELL_LABEL
                );

            if (
                bell &&
                !bell.destroyed
            ) {
                cachedBell = bell;
                return bell;
            }

            await sleep(250);
        }

        return null;
    }

    function getBellPosition(
        canvas,
        bell
    ) {

        try {

            const rect =
                canvas.getBoundingClientRect();

            const p1 =
                bell.toGlobal({
                    x: 0,
                    y: 0
                });

            const p2 =
                bell.toGlobal({
                    x: 45,
                    y: 45
                });

            return {
                x:
                    rect.left +
                    (p1.x + p2.x) / 2,

                y:
                    rect.top +
                    (p1.y + p2.y) / 2
            };

        } catch {

            return null;
        }
    }

    async function clickBell() {

        const state = getState();
        const canvas = getCanvas(state);

        const bell =
            await getBell();

        if (
            !bell ||
            !canvas
        ) {
            return false;
        }

        const pos =
            getBellPosition(
                canvas,
                bell
            );

        if (!pos) {
            cachedBell = null;
            return false;
        }

        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: pos.x,
            clientY: pos.y,
            button: 0,
            buttons: 1,
            pointerType: 'mouse',
            pointerId: 1,
            isPrimary: true
        };

        canvas.dispatchEvent(
            new PointerEvent(
                'pointerdown',
                common
            )
        );

        canvas.dispatchEvent(
            new PointerEvent(
                'pointerup',
                common
            )
        );

        return true;
    }

    function visible(el) {

        if (
            !el ||
            !el.isConnected
        ) {
            return false;
        }

        const rect =
            el.getBoundingClientRect();

        return (
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function findBuyAllButtons() {

        return [...document.querySelectorAll('button')]
            .filter(btn =>
                visible(btn) &&
                !btn.disabled &&
                btn.textContent?.trim() ===
                'Buy all'
            );
    }

    async function waitButtons() {

        const start =
            Date.now();

        while (
            Date.now() - start <
            BUTTON_TIMEOUT
        ) {

            const buttons =
                findBuyAllButtons();

            if (
                buttons.length
            ) {
                return buttons;
            }

            await sleep(200);
        }

        return [];
    }

    async function autoBuy() {

        if (running) {
            return;
        }

        running = true;

        let opened = false;

        try {

            let buttons =
                findBuyAllButtons();

            if (
                !buttons.length
            ) {

                const ok =
                    await clickBell();

                if (!ok) {
                    return;
                }

                opened = true;

                buttons =
                    await waitButtons();
            }

            for (const btn of buttons) {

                try {
                    btn.click();
                } catch {}
            }

            await sleep(1500);

            if (opened) {
                await clickBell();
            }

        } finally {

            running = false;
        }
    }

    setTimeout(
        autoBuy,
        FIRST_RUN_DELAY
    );

    setInterval(
        autoBuy,
        REPEAT_INTERVAL
    );

})();
