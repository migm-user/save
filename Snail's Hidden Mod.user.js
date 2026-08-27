// ==UserScript==
// @name         Snail's Hidden Mod
// @namespace    O_"
// @author       O_"
// @version      1.1.0
// @description  자동 구매 + 알 자동 심기 + 자동 급식 + 알/펫 관리 + 천장 계산기
// @match        https://1227719606223765687.discordsays.com/*
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @match        https://ariesmod-api.ariedam.fr/*
// @run-at       document-idle
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      mg-api.ariedam.fr
// @connect      magicgarden.gg
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Hidden%20Mod.user.js
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Hidden%20Mod.user.js
// ==/UserScript==

// 버전 규칙: 수정은 패치(+0.0.1), 새 기능 추가는 마이너(+0.1.0)를 올린다.

(() => {
    'use strict';

    if (window.__SNAILS_HIDDEN_MOD_RUNNING__) return;
    window.__SNAILS_HIDDEN_MOD_RUNNING__ = true;

    const PageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const BUTTON_SIZE = 44; // Snail's Mobile과 동일한 크기
    const AUTO_BUY_FIRST_DELAY = 10_000;
    const AUTO_BUY_INTERVAL = 120_000;
    const AUTO_PLANT_FIRST_DELAY = 12_000;
    const AUTO_PLANT_INTERVAL = 15_000;
    const AUTO_FEED_FIRST_DELAY = 2_000;
    const AUTO_FEED_INTERVAL = 900_000;
    const FEED_CONFIRM_TIMEOUT = 15_000;
    const SCRIPT_VERSION = '1.1.0';
    const MAX_ACTIVE_PETS = 3;
    const SCREEN_MARGIN = 8; // Arie's Mod Floating Bell과 동일
    const DEFAULT_RIGHT_GAP = 16;
    const SETTINGS_KEY = 'snails-mod.settings.v2';
    const POSITION_KEY = 'snails-mod.icon-position.v2';
    const PANEL_POSITION_KEY = 'snails-mod.panel-position.v1';
    const LAST_TEAM_KEY = 'snails-mod.last-team.v1';
    const PITY_STATE_KEY = 'snails-mod.pity-state.v1';
    const PITY_CATALOG_CACHE_KEY = 'snails-mod.pity-catalog.v1';
    const PITY_CATALOG_CACHE_MS = 6 * 60 * 60 * 1_000;
    const PITY_ACTIVITY_POLL_MS = 400;
    const PITY_HATCH_LOG_TIMEOUT = 5_000;
    const STYLE_ID = 'snails-mod-v2-style';
    const PANEL_ID = 'snails-mod-v2-panel';
    const ICON_ID = 'snails-mod-v2-icon';
    const PITY_EGG_IDS = [
        'CommonEgg', 'UncommonEgg', 'RareEgg', 'SnowEgg',
        'LegendaryEgg', 'DawnEgg', 'ThunderEgg', 'MythicalEgg'
    ];
    const PITY_KOREAN_NAMES = {
        Bee: '벌', Dragonfly: '잠자리', Turkey: '칠면조', WhiteCaribou: '순록',
        Goat: '염소', Ostrich: '타조', ThunderWolf: '천둥늑대', Capybara: '카피바라',
        Gold: 'Gold', Rainbow: 'Rainbow'
    };
    const FALLBACK_PITY_CATALOG = {
        CommonEgg: { name: 'Common Egg', faunaSpawnWeights: { Bee: 5 }, speciesPityThresholdPulls: { Bee: 40 } },
        UncommonEgg: { name: 'Uncommon Egg', faunaSpawnWeights: { Dragonfly: 5 }, speciesPityThresholdPulls: { Dragonfly: 40 } },
        RareEgg: { name: 'Rare Egg', faunaSpawnWeights: { Turkey: 5 }, speciesPityThresholdPulls: { Turkey: 40 } },
        SnowEgg: { name: 'Snow Egg', faunaSpawnWeights: { WhiteCaribou: 5 }, speciesPityThresholdPulls: { WhiteCaribou: 40 } },
        LegendaryEgg: { name: 'Legendary Egg', faunaSpawnWeights: { Goat: 5 }, speciesPityThresholdPulls: { Goat: 40 } },
        DawnEgg: { name: 'Dawn Egg', faunaSpawnWeights: { Ostrich: 5 }, speciesPityThresholdPulls: { Ostrich: 40 } },
        ThunderEgg: { name: 'Thunder Egg', faunaSpawnWeights: { ThunderWolf: 5 }, speciesPityThresholdPulls: { ThunderWolf: 40 } },
        MythicalEgg: { name: 'Mythical Egg', faunaSpawnWeights: { Capybara: 5 }, speciesPityThresholdPulls: { Capybara: 40 } },
        mutationThresholds: { Gold: 200, Rainbow: 2_000 }
    };

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const clampInt = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
        const number = Math.floor(Number(value));
        return Number.isFinite(number) ? clamp(number, min, max) : min;
    };
    const escapeHtml = value => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    function defaultSettings() {
        return {
            autoBuy: true,
            autoPlant: false,
            autoFeed: false,
            intervals: {
                autoBuy: AUTO_BUY_INTERVAL,
                autoFeed: AUTO_FEED_INTERVAL
            },
            ui: { collapsedSections: [], page: 1 },
            egg: {
                mode: 'single',
                single: { eggId: '', reserve: 0 },
                priority: { order: [], config: {} }
            },
            pets: {
                usePresetSwitch: true,
                hatchTeamId: '',
                pityTeamId: '',
                sellTeamId: '',
                restoreAfterHatch: true,
                restoreAfterSell: true,
                useSaleProtection: true,
                protectGold: true,
                protectRainbow: true,
                protectStr: true,
                strThreshold: 0,
                confirmBeforeSell: true
            },
            pity: { stopBeforePity: false }
        };
    }

    function readStored(key, fallback) {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(key, fallback);
        } catch {}
        try {
            const raw = localStorage.getItem(key);
            return raw == null ? fallback : JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function writeStored(key, value) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
                return;
            }
        } catch {}
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {}
    }

    function normalizeSettings(saved) {
        const base = defaultSettings();
        if (!saved || typeof saved !== 'object') return base;
        const collapsedSections = saved.ui?.collapsedSections ?? saved.ui?.collapsedPetSections;
        const migratedCollapsedSections = Array.isArray(collapsedSections)
            ? collapsedSections.map(String)
            : [];
        if (migratedCollapsedSections.some(key => key === 'buyInterval' || key === 'feedInterval')) {
            migratedCollapsedSections.push('intervalSettings');
        }
        if (migratedCollapsedSections.includes('sellPopup')) {
            migratedCollapsedSections.push('miscellaneous');
        }
        return {
            ...base,
            autoBuy: saved.autoBuy === undefined ? true : !!saved.autoBuy,
            autoPlant: !!saved.autoPlant,
            autoFeed: !!saved.autoFeed,
            intervals: {
                autoBuy: clampInt(saved.intervals?.autoBuy ?? base.intervals.autoBuy, 5_000, 3_600_000),
                autoFeed: clampInt(saved.intervals?.autoFeed ?? base.intervals.autoFeed, 2_000, 3_600_000)
            },
            ui: {
                ...base.ui,
                ...(saved.ui || {}),
                page: clampInt(saved.ui?.page ?? base.ui.page, 1, 3),
                collapsedSections: [...new Set(migratedCollapsedSections
                    .filter(key => key !== 'buyInterval' && key !== 'feedInterval' && key !== 'sellPopup'))]
            },
            egg: {
                ...base.egg,
                ...(saved.egg || {}),
                single: { ...base.egg.single, ...(saved.egg?.single || {}) },
                priority: {
                    ...base.egg.priority,
                    ...(saved.egg?.priority || {}),
                    order: Array.isArray(saved.egg?.priority?.order)
                        ? saved.egg.priority.order.map(String)
                        : [],
                    config: saved.egg?.priority?.config && typeof saved.egg.priority.config === 'object'
                        ? saved.egg.priority.config
                        : {}
                }
            },
            pets: { ...base.pets, ...(saved.pets || {}) },
            pity: { ...base.pity, ...(saved.pity || {}) }
        };
    }

    function loadSettings() {
        return normalizeSettings(readStored(SETTINGS_KEY, null));
    }

    let settings = loadSettings();
    let panelPosition = (() => {
        const saved = readStored(PANEL_POSITION_KEY, null);
        const left = Number(saved?.left);
        const top = Number(saved?.top);
        return Number.isFinite(left) && Number.isFinite(top) ? { left, top } : null;
    })();

    function saveSettings() {
        writeStored(SETTINGS_KEY, settings);
    }

    // ---------------------------------------------------------------------
    // 구매 가능한 알림 항목을 자동으로 구매하는 기능
    // ---------------------------------------------------------------------
    let autoBuying = false;
    let bellWarningShown = false;

    function clickNotificationBell() {
        const bell = document.querySelector('button[data-notification-bell-widget="1"]');
        if (!bell) {
            if (!bellWarningShown && settings.autoBuy) {
                bellWarningShown = true;
                alert(`이 메세지는 Snail's Hidden Mod 사용자에게 전송 되는 것입니다.
자동으로 구매를 하기 위해 필요한 Floating Bell을 찾을 수 없습니다.

Alerts → Settings → Floating bell [On]

으로 설정한 후 다시 시도하세요.`);
            }
            return false;
        }

        bellWarningShown = false;
        const rect = bell.getBoundingClientRect();
        const eventBase = {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        };
        bell.dispatchEvent(new PointerEvent('pointerdown', { ...eventBase, buttons: 1 }));
        document.dispatchEvent(new PointerEvent('pointerup', { ...eventBase, buttons: 0 }));
        return true;
    }

    function getBuyAllButtons() {
        return [...document.querySelectorAll('button')].filter(button =>
            button.isConnected &&
            !button.disabled &&
            button.offsetParent !== null &&
            button.textContent.trim() === 'Buy all'
        );
    }

    async function autoBuy() {
        if (!settings.autoBuy || autoBuying) return;
        autoBuying = true;
        let bellOpened = false;
        try {
            console.log('[Snail/AutoBuy] 검사 시작');
            bellOpened = clickNotificationBell();
            if (!bellOpened) return;

            let buttons = [];
            for (let i = 0; i < 15 && settings.autoBuy; i++) {
                await sleep(100);
                buttons = getBuyAllButtons();
                if (buttons.length) break;
            }

            for (const button of buttons) {
                if (!settings.autoBuy) break;
                try { button.click(); } catch (error) { console.warn('[Snail/AutoBuy]', error); }
            }
            if (buttons.length) await sleep(500);
        } catch (error) {
            console.error('[Snail/AutoBuy]', error);
        } finally {
            if (bellOpened) clickNotificationBell();
            autoBuying = false;
        }
    }

    // ---------------------------------------------------------------------
    // 활성 펫의 굶주림을 확인하고 자동으로 먹이를 주는 기능
    // 펫별 굶주림 임계값과 Feeding 작물 설정을 사용한다.
    // ---------------------------------------------------------------------
    const ARIES_SETTINGS_KEY = 'aries_mod';
    let activeFeedPets = [];
    let autoFeedUnsubscribe = null;
    let autoFeedSubscribing = false;
    let autoFeedChecking = false;
    let instantFeedWidgetRoot = null;
    const pendingFeeds = new Map();

    function readAriesSettings() {
        try {
            return JSON.parse(localStorage.getItem(ARIES_SETTINGS_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function enableInstantFeedWidget() {
        const ariesSettings = readAriesSettings();
        ariesSettings.pets ??= {};
        ariesSettings.pets.instantFeedWidget ??= {};
        if (ariesSettings.pets.instantFeedWidget.enabled === true) return true;
        ariesSettings.pets.instantFeedWidget.enabled = true;
        try {
            localStorage.setItem(ARIES_SETTINGS_KEY, JSON.stringify(ariesSettings));
            return true;
        } catch {
            return false;
        }
    }

    function getAutoFeedRule(petId, alerts) {
        const defaultThreshold = clampInt(alerts.defaultThresholdPct ?? 25, 1, 100);
        if (alerts.globalEnabled === false) return { enabled: false, threshold: defaultThreshold };
        if (alerts.generalEnabled === true) return { enabled: true, threshold: defaultThreshold };
        const petRule = alerts.pets?.[petId] ?? {};
        return {
            enabled: petRule.enabled === true,
            threshold: clampInt(petRule.thresholdPct ?? defaultThreshold, 1, 100)
        };
    }

    function getPetsService() {
        return PageWindow.QWS_PetsService || window.QWS_PetsService || globalThis.QWS_PetsService || null;
    }

    function getActivePetId(pet) {
        return String(pet?.slot?.id ?? '').trim();
    }

    function getPetHunger(pet) {
        try {
            const value = Number(getPetsService()?.getHungerPctFor?.(pet));
            return Number.isFinite(value) ? value : NaN;
        } catch {
            return NaN;
        }
    }

    function getFeedButtons() {
        return [...document.querySelectorAll('[data-instant-feed-btn="1"][data-pet-id]')]
            .filter(button => button.isConnected && String(button.dataset.petId || '').trim());
    }

    function getActivePetName(pet, index, button) {
        return String(
            button?.querySelector('[data-instant-feed-name="1"]')?.textContent ||
            pet?.slot?.petSpecies ||
            pet?.petSpecies ||
            pet?.species ||
            `${index + 1}번 펫`
        ).trim();
    }

    function setInstantFeedWidgetHidden(hidden, buttons = null) {
        if (!hidden) {
            instantFeedWidgetRoot?.classList.remove('snail-hide-feed-widget');
            instantFeedWidgetRoot = null;
            return;
        }
        if (instantFeedWidgetRoot?.isConnected) {
            instantFeedWidgetRoot.classList.add('snail-hide-feed-widget');
            return;
        }
        const currentButtons = buttons || getFeedButtons();
        if (!currentButtons.length) return;
        let root = currentButtons[0].parentElement;
        for (let depth = 0; depth < 10 && root; depth++, root = root.parentElement) {
            if (currentButtons.every(button => root.contains(button)) &&
                String(root.textContent || '').includes('Instant Feed')) {
                instantFeedWidgetRoot = root;
                root.classList.add('snail-hide-feed-widget');
                return;
            }
        }
    }

    function confirmPendingFeeds() {
        const now = Date.now();
        for (const [petId, pending] of pendingFeeds) {
            if (now - pending.time > FEED_CONFIRM_TIMEOUT) {
                pendingFeeds.delete(petId);
                continue;
            }
            const pet = activeFeedPets.find(item => getActivePetId(item) === petId);
            if (!pet) continue;
            const hunger = getPetHunger(pet);
            if (Number.isFinite(hunger) && hunger > pending.before + 0.01) {
                pendingFeeds.delete(petId);
                setStatus(`자동 급식 완료 · ${pending.name}`, 'ok');
            }
        }
    }

    async function subscribeAutoFeedPets({ announce = false } = {}) {
        if (!settings.autoFeed || autoFeedSubscribing || typeof autoFeedUnsubscribe === 'function') return true;
        const service = getPetsService();
        if (typeof service?.onPetsChangeNow !== 'function' || typeof service?.getHungerPctFor !== 'function') {
            if (announce) setStatus("자동 급식: Arie's Mod 활성 펫 서비스를 기다리는 중", 'error');
            return false;
        }
        autoFeedSubscribing = true;
        try {
            const stop = await service.onPetsChangeNow(pets => {
                activeFeedPets = Array.isArray(pets)
                    ? pets.filter(pet => getActivePetId(pet)).slice(0, MAX_ACTIVE_PETS)
                    : [];
                confirmPendingFeeds();
            });
            if (!settings.autoFeed) {
                try { if (typeof stop === 'function') stop(); } catch {}
                activeFeedPets = [];
                return false;
            }
            autoFeedUnsubscribe = typeof stop === 'function' ? stop : () => {};
            return true;
        } catch (error) {
            autoFeedUnsubscribe = null;
            if (announce) setStatus('자동 급식: 활성 펫 데이터 연결 실패', 'error');
            console.warn('[Snail/AutoFeed] pet subscription failed', error);
            return false;
        } finally {
            autoFeedSubscribing = false;
        }
    }

    function stopAutoFeed() {
        try { autoFeedUnsubscribe?.(); } catch {}
        autoFeedUnsubscribe = null;
        activeFeedPets = [];
        pendingFeeds.clear();
        setInstantFeedWidgetHidden(false);
    }

    function feedActivePet(petId, name, hunger, threshold, button) {
        if (pendingFeeds.has(petId) || !button?.isConnected) return false;
        if (String(button.dataset.petId || '').trim() !== petId) return false;
        try {
            pendingFeeds.set(petId, { name, before: hunger, threshold, time: Date.now() });
            button.click();
            setStatus(`자동 급식 요청 · ${name} (${hunger.toFixed(1)}% ≤ ${threshold}%)`);
            return true;
        } catch (error) {
            pendingFeeds.delete(petId);
            console.warn('[Snail/AutoFeed] feed click failed', error);
            return false;
        }
    }

    async function checkAutoFeed({ announce = false } = {}) {
        if (!settings.autoFeed || autoFeedChecking) return;
        autoFeedChecking = true;
        try {
            if (!enableInstantFeedWidget() && announce) {
                setStatus('자동 급식: Instant Feed 설정 저장 실패', 'error');
            }
            const feedButtons = getFeedButtons();
            const buttonsByPetId = new Map(feedButtons.map(button => [String(button.dataset.petId || '').trim(), button]));
            const alerts = readAriesSettings()?.pets?.alerts ?? {};
            setInstantFeedWidgetHidden(true, feedButtons);
            confirmPendingFeeds();
            if (typeof autoFeedUnsubscribe !== 'function' && !await subscribeAutoFeedPets({ announce })) return;
            if (!activeFeedPets.length) {
                if (announce) setStatus('자동 급식: 활성 펫 데이터를 기다리는 중');
                return;
            }
            for (let index = 0; index < activeFeedPets.length; index++) {
                if (!settings.autoFeed) break;
                const pet = activeFeedPets[index];
                const petId = getActivePetId(pet);
                const hunger = getPetHunger(pet);
                const rule = getAutoFeedRule(petId, alerts);
                const button = buttonsByPetId.get(petId) || null;
                if (!Number.isFinite(hunger) || !button || !rule.enabled || hunger > rule.threshold) continue;
                feedActivePet(petId, getActivePetName(pet, index, button), hunger, rule.threshold, button);
            }
        } catch (error) {
            if (announce) setStatus('자동 급식 검사 중 오류 발생', 'error');
            console.warn('[Snail/AutoFeed]', error);
        } finally {
            autoFeedChecking = false;
        }
    }

    // ---------------------------------------------------------------------
    // 알 심기·부화와 펫 프리셋·안전 판매를 관리하는 기능
    // ---------------------------------------------------------------------
    const sockets = new Set();
    const PageWebSocket = PageWindow.WebSocket || window.WebSocket;
    let gameSocket = null;
    let lastAppliedTeamId = String(readStored(LAST_TEAM_KEY, '') || '');
    let jotaiStore = null;
    let storeCapturePromise = null;
    let activeTask = null;
    let cancelRequested = false;
    let lastHatchServerError = null;
    let modal = null;
    let statusTimer = null;
    let pityCatalog = FALLBACK_PITY_CATALOG;
    let pityCatalogSource = '내장 예비 데이터';
    let pityCatalogPromise = null;
    let pityState = normalizePityState(readStored(PITY_STATE_KEY, null));
    let pityAccountId = '';
    let pityTrackingTimer = null;
    let pityTrackingBusy = false;
    let pityPollPromise = null;
    let pityHatchSequence = 0;
    let pityHatchEvents = [];
    const pityEggSlots = new Map();

    function rememberTeamId(teamId) {
        const id = String(teamId || '').trim();
        if (!id) return false;
        lastAppliedTeamId = id;
        writeStored(LAST_TEAM_KEY, id);
        refreshPresetDisplay();
        return true;
    }

    function findApplyPetTeamId(value, depth = 0, seen = new Set()) {
        if (depth > 12 || value == null) return '';
        if (typeof value === 'string') {
            const text = value.trim();
            if (text[0] === '{' || text[0] === '[') {
                try { return findApplyPetTeamId(JSON.parse(text), depth + 1, seen); } catch {}
            }
            return '';
        }
        if (typeof value !== 'object' && typeof value !== 'function') return '';
        if (seen.has(value)) return '';
        seen.add(value);
        if (value.type === 'ApplyPetTeam' && String(value.teamId || '').trim()) {
            return String(value.teamId).trim();
        }
        if (value.command?.type === 'ApplyPetTeam' && String(value.command.teamId || '').trim()) {
            return String(value.command.teamId).trim();
        }
        for (const item of Array.isArray(value) ? value : Object.values(value)) {
            const id = findApplyPetTeamId(item, depth + 1, seen);
            if (id) return id;
        }
        return '';
    }

    function learnFromPayload(raw) {
        let value = raw;
        try {
            if (raw instanceof ArrayBuffer) value = new TextDecoder().decode(raw);
            else if (ArrayBuffer.isView(raw)) {
                value = new TextDecoder().decode(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
            }
        } catch {}
        const teamId = findApplyPetTeamId(value);
        if (teamId) rememberTeamId(teamId);
    }

    function findHatchRequest(value, depth = 0, seen = new Set()) {
        if (depth > 10 || value == null) return null;
        if (typeof value === 'string') {
            const text = value.trim();
            if (text[0] === '{' || text[0] === '[') {
                try { return findHatchRequest(JSON.parse(text), depth + 1, seen); } catch {}
            }
            return null;
        }
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
            try {
                const bytes = value instanceof ArrayBuffer
                    ? value
                    : value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
                return findHatchRequest(new TextDecoder().decode(bytes), depth + 1, seen);
            } catch {
                return null;
            }
        }
        if (typeof value !== 'object' && typeof value !== 'function') return null;
        if (seen.has(value)) return null;
        seen.add(value);
        if (value.type === 'HatchEgg') {
            return { slot: Number(value.slot), eggId: String(value.eggId || '') };
        }
        if (value.command?.type === 'HatchEgg') {
            return { slot: Number(value.command.slot), eggId: String(value.command.eggId || '') };
        }
        for (const item of Array.isArray(value) ? value : Object.values(value)) {
            const found = findHatchRequest(item, depth + 1, seen);
            if (found) return found;
        }
        return null;
    }

    function shouldBlockHatchPayload(raw) {
        if (!settings.pity.stopBeforePity) return false;
        const request = findHatchRequest(raw);
        if (!request) return false;
        const eggId = request.eggId || pityEggSlots.get(request.slot) || '';
        const reason = getPityStopReason(eggId);
        if (!reason) return false;
        setStatus(`천장 보호 · ${reason.label} ${reason.count}/${reason.threshold}`, 'error');
        return true;
    }

    function detectHatchServerError(data) {
        let text = '';
        try {
            if (typeof data === 'string') text = data;
            else if (data instanceof ArrayBuffer) text = new TextDecoder().decode(data);
        } catch {}
        if (!text) return;
        let reason = '';
        if (/inventory.{0,30}(full|capacity|space)/i.test(text) ||
            /(full|capacity).{0,30}inventory/i.test(text) ||
            /inventoryfull/i.test(text) ||
            /not enough.{0,20}(inventory|space)/i.test(text)) {
            reason = '인벤토리 가득 참';
        } else if (/hatch.{0,40}(fail|error|reject|denied)/i.test(text)) {
            reason = '부화 요청 거부';
        }
        if (reason) lastHatchServerError = { at: Date.now(), reason };
    }

    function trackSocket(socket) {
        if (!socket) return;
        sockets.add(socket);
        gameSocket = socket;
        if (socket.__snailMessageHooked) return;
        try {
            socket.addEventListener('message', event => detectHatchServerError(event.data));
            Object.defineProperty(socket, '__snailMessageHooked', { value: true });
        } catch {}
    }

    function hookWebSocketSend(WebSocketCtor) {
        const proto = WebSocketCtor?.prototype;
        const current = proto?.send;
        if (typeof current !== 'function' || current.__snailPetWrapper) return;
        const wrapped = function (data) {
            try {
                trackSocket(this);
                learnFromPayload(data);
                if (shouldBlockHatchPayload(data)) return;
            } catch {}
            return current.call(this, data);
        };
        Object.defineProperty(wrapped, '__snailPetWrapper', { value: true });
        try { proto.send = wrapped; } catch {}
    }

    function hookRoomConnection(connection) {
        const current = connection?.sendMessage;
        if (typeof current !== 'function' || current.__snailPetWrapper) return;
        const wrapped = function (...args) {
            try {
                args.forEach(learnFromPayload);
                trackSocket(this?.currentWebSocket || connection.currentWebSocket);
                if (args.some(shouldBlockHatchPayload)) return;
            } catch {}
            return current.apply(this, args);
        };
        Object.defineProperty(wrapped, '__snailPetWrapper', { value: true });
        try { connection.sendMessage = wrapped; } catch {}
    }

    function installGameHooks() {
        try { hookWebSocketSend(PageWindow.WebSocket); } catch {}
        try { if (window.WebSocket !== PageWindow.WebSocket) hookWebSocketSend(window.WebSocket); } catch {}
        try { hookRoomConnection(PageWindow.MagicCircle_RoomConnection); } catch {}
        try { trackSocket(PageWindow.MagicCircle_RoomConnection?.currentWebSocket); } catch {}
    }

    let gameHookTimer = null;
    function maintainGameHooks() {
        installGameHooks();
        for (const socket of sockets) {
            if (socket?.readyState > PageWebSocket.OPEN) sockets.delete(socket);
        }
        const connected = !!PageWindow.MagicCircle_RoomConnection || gameSocket?.readyState === PageWebSocket.OPEN;
        const delay = document.hidden ? 15_000 : connected ? 5_000 : 750;
        gameHookTimer = setTimeout(maintainGameHooks, delay);
    }
    maintainGameHooks();
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        clearTimeout(gameHookTimer);
        maintainGameHooks();
    });

    function getGameSocket() {
        try { trackSocket(PageWindow.MagicCircle_RoomConnection?.currentWebSocket); } catch {}
        if (gameSocket?.readyState === PageWebSocket.OPEN) return gameSocket;
        for (const socket of sockets) {
            if (socket?.readyState === PageWebSocket.OPEN) {
                gameSocket = socket;
                return socket;
            }
        }
        throw new Error('게임 WebSocket을 찾지 못했습니다.');
    }

    function sendGame(command) {
        if (command?.type === 'ApplyPetTeam' && command.teamId) rememberTeamId(command.teamId);
        const message = { scopePath: ['Room', 'Quinoa'], ...command };
        const connection = PageWindow.MagicCircle_RoomConnection;
        if (connection && typeof connection.sendMessage === 'function') {
            connection.sendMessage(message);
            return true;
        }
        getGameSocket().send(JSON.stringify(message));
        return true;
    }

    function getAtomCache() {
        return PageWindow.jotaiAtomCache?.cache || window.jotaiAtomCache?.cache || null;
    }

    function getSharedAtoms() {
        return PageWindow.QWS_Atoms || window.QWS_Atoms || null;
    }

    async function waitForAtomCache() {
        const started = Date.now();
        while (Date.now() - started < 2_500) {
            const cache = getAtomCache();
            if (cache) return cache;
            await sleep(100);
        }
        return null;
    }

    function findStoreViaFiber() {
        const hook = PageWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ || window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!hook?.renderers?.size || typeof hook.getFiberRoots !== 'function') return null;
        for (const [rendererId] of hook.renderers) {
            for (const root of hook.getFiberRoots(rendererId) || []) {
                const seen = new Set();
                const stack = [root.current];
                while (stack.length) {
                    const fiber = stack.pop();
                    if (!fiber || seen.has(fiber)) continue;
                    seen.add(fiber);
                    for (const value of [fiber.pendingProps?.value, fiber.memoizedProps?.value]) {
                        if (value && typeof value.get === 'function' && typeof value.set === 'function') return value;
                    }
                    if (fiber.child) stack.push(fiber.child);
                    if (fiber.sibling) stack.push(fiber.sibling);
                    if (fiber.alternate) stack.push(fiber.alternate);
                }
            }
        }
        return null;
    }

    async function captureStoreViaWriteOnce() {
        const cache = getAtomCache() || await waitForAtomCache();
        if (!cache) throw new Error('게임 내부 데이터 연결을 찾지 못했습니다.');
        let capturedGet = null;
        let capturedSet = null;
        const patched = [];
        const restore = () => {
            for (const atom of patched) {
                try {
                    if (atom.__snailOriginalWrite) {
                        atom.write = atom.__snailOriginalWrite;
                        delete atom.__snailOriginalWrite;
                    }
                } catch {}
            }
        };
        for (const atom of cache.values()) {
            if (!atom || typeof atom.write !== 'function' || atom.__snailOriginalWrite) continue;
            const original = atom.write;
            atom.__snailOriginalWrite = original;
            atom.write = function (get, set, ...args) {
                if (!capturedSet) {
                    capturedGet = get;
                    capturedSet = set;
                    restore();
                }
                return original.call(this, get, set, ...args);
            };
            patched.push(atom);
        }
        try { PageWindow.dispatchEvent(new Event('visibilitychange')); } catch {}
        const started = Date.now();
        while (!capturedSet && Date.now() - started < 1_200) await sleep(50);
        if (!capturedGet || !capturedSet) {
            restore();
            throw new Error('Jotai Store 자동 캡처에 실패했습니다.');
        }
        return { get: atom => capturedGet(atom), set: (atom, value) => capturedSet(atom, value) };
    }

    async function ensureStore() {
        if (jotaiStore) return jotaiStore;
        if (storeCapturePromise) return storeCapturePromise;
        storeCapturePromise = (async () => {
            try {
                const bridge = PageWindow.__MG_STORE_BRIDGE__ || window.__MG_STORE_BRIDGE__;
                if (bridge?.promise) {
                    const store = await bridge.promise;
                    if (store && !store.__polyfill && typeof store.get === 'function') return store;
                }
            } catch {}
            return findStoreViaFiber() || await captureStoreViaWriteOnce();
        })();
        try {
            jotaiStore = await storeCapturePromise;
            return jotaiStore;
        } finally {
            if (!jotaiStore) storeCapturePromise = null;
        }
    }

    function getAtomByLabel(label) {
        const cache = getAtomCache();
        if (!cache) return null;
        for (const atom of cache.values()) {
            if (String(atom?.debugLabel || atom?.label || '') === label) return atom;
        }
        return null;
    }

    async function readSharedAtom(label) {
        const atoms = getSharedAtoms();
        if (!atoms) return undefined;
        try {
            switch (label) {
                case 'stateAtom': return await atoms.root?.state?.get?.();
                case 'mapAtom': return await atoms.root?.map?.get?.();
                case 'myInventoryAtom': return await atoms.inventory?.myInventory?.get?.();
                case 'myDataAtom': {
                    const data = await atoms.data?.myData?.get?.();
                    if (data !== undefined) return data;
                    const garden = await atoms.data?.garden?.get?.();
                    return garden === undefined ? undefined : { garden };
                }
                case 'myActivityLogAtom': {
                    const direct = await atoms.data?.myActivityLog?.get?.();
                    if (direct !== undefined) return direct;
                    const data = await atoms.data?.myData?.get?.();
                    return data?.activityLogs ?? data?.activityLog;
                }
                case 'playerAtom': return {
                    id: await atoms.player?.playerId?.get?.(),
                    databaseUserId: await atoms.player?.playerDatabaseUserId?.get?.(),
                    discordUserId: await atoms.player?.discordUserId?.get?.()
                };
                default: return undefined;
            }
        } catch {
            return undefined;
        }
    }

    async function readAtom(label, fallback = undefined) {
        const shared = await readSharedAtom(label);
        if (shared !== undefined) return shared;
        try {
            const store = await ensureStore();
            const atom = getAtomByLabel(label);
            return atom ? store.get(atom) : fallback;
        } catch {
            return fallback;
        }
    }

    // ---------------------------------------------------------------------
    // 최신 Bad Luck Protection 규칙을 따라 부화 천장을 추적하는 기능
    // ---------------------------------------------------------------------
    function normalizePityState(raw) {
        const output = { version: 1, accounts: {} };
        if (!raw || typeof raw !== 'object' || !raw.accounts || typeof raw.accounts !== 'object') return output;
        for (const [accountId, value] of Object.entries(raw.accounts)) {
            if (!value || typeof value !== 'object') continue;
            const counters = {};
            if (value.counters && typeof value.counters === 'object') {
                for (const [eggId, entries] of Object.entries(value.counters)) {
                    if (!entries || typeof entries !== 'object') continue;
                    counters[String(eggId)] = Object.fromEntries(Object.entries(entries)
                        .filter(([key]) => typeof key === 'string')
                        .map(([key, count]) => [key, clampInt(count, 0)]));
                }
            }
            output.accounts[String(accountId)] = {
                counters,
                legacyAccount: !!value.legacyAccount,
                legacyBonusApplied: !!value.legacyBonusApplied,
                logInitialized: !!value.logInitialized,
                seenLogKeys: Array.isArray(value.seenLogKeys)
                    ? value.seenLogKeys.map(String).slice(-100)
                    : [],
                trackingStartedAt: clampInt(value.trackingStartedAt, 0),
                lastCountedAt: clampInt(value.lastCountedAt, 0),
                lastResult: value.lastResult && typeof value.lastResult === 'object'
                    ? { ...value.lastResult }
                    : null
            };
        }
        return output;
    }

    function savePityState() {
        writeStored(PITY_STATE_KEY, pityState);
    }

    function createPityAccountState() {
        return {
            counters: {},
            legacyAccount: false,
            legacyBonusApplied: false,
            logInitialized: false,
            seenLogKeys: [],
            trackingStartedAt: Date.now(),
            lastCountedAt: 0,
            lastResult: null
        };
    }

    function getPityAccountState(create = false) {
        if (!pityAccountId) return null;
        if (!pityState.accounts[pityAccountId] && create) {
            pityState.accounts[pityAccountId] = createPityAccountState();
            savePityState();
        }
        return pityState.accounts[pityAccountId] || null;
    }

    function readAccountId(player) {
        const candidates = [
            player?.databaseUserId, player?.discordUserId, player?.userId, player?.id,
            player?.data?.databaseUserId, player?.data?.discordUserId,
            player?.data?.userId, player?.data?.id
        ];
        const found = candidates.find(value => value != null && String(value).trim());
        return found == null ? '' : String(found).trim();
    }

    async function ensurePityAccount() {
        const player = await readAtom('playerAtom', null);
        const resolved = readAccountId(player);
        if (!resolved) return null;
        if (pityAccountId !== resolved) pityAccountId = resolved;
        return getPityAccountState(true);
    }

    function normalizePityCatalog(raw) {
        const source = raw?.eggs && typeof raw.eggs === 'object' ? raw.eggs : raw;
        const mutations = raw?.mutations && typeof raw.mutations === 'object' ? raw.mutations : {};
        if (!source || typeof source !== 'object') return null;
        const output = {};
        for (const eggId of PITY_EGG_IDS) {
            const entry = source[eggId];
            if (!entry || typeof entry !== 'object') continue;
            const weights = entry.faunaSpawnWeights && typeof entry.faunaSpawnWeights === 'object'
                ? Object.fromEntries(Object.entries(entry.faunaSpawnWeights)
                    .map(([species, chance]) => [String(species), Number(chance)])
                    .filter(([, chance]) => Number.isFinite(chance) && chance > 0))
                : {};
            const thresholds = entry.speciesPityThresholdPulls && typeof entry.speciesPityThresholdPulls === 'object'
                ? Object.fromEntries(Object.entries(entry.speciesPityThresholdPulls)
                    .map(([species, threshold]) => [String(species), clampInt(threshold, 1)])
                    .filter(([, threshold]) => threshold > 0))
                : {};
            if (!Object.keys(thresholds).length) continue;
            output[eggId] = {
                name: String(entry.name || FALLBACK_PITY_CATALOG[eggId]?.name || eggId),
                faunaSpawnWeights: weights,
                speciesPityThresholdPulls: thresholds
            };
        }
        if (PITY_EGG_IDS.some(eggId => !output[eggId])) return null;
        const thresholdFromChance = (name, fallback) => {
            const cachedThreshold = Number(raw?.mutationThresholds?.[name]);
            if (Number.isFinite(cachedThreshold) && cachedThreshold > 0) return Math.round(cachedThreshold);
            const chance = Number(mutations[name]?.baseChance);
            return Number.isFinite(chance) && chance > 0 ? Math.round(2 / chance) : fallback;
        };
        output.mutationThresholds = {
            Gold: thresholdFromChance('Gold', 200),
            Rainbow: thresholdFromChance('Rainbow', 2_000)
        };
        return output;
    }

    function getPityCatalog() {
        if (pityCatalogPromise) return pityCatalogPromise;
        pityCatalogPromise = (async () => {
            const cached = readStored(PITY_CATALOG_CACHE_KEY, null);
            const cachedCatalog = normalizePityCatalog(cached?.data);
            if (cachedCatalog && Date.now() - Number(cached.savedAt) < PITY_CATALOG_CACHE_MS) {
                pityCatalog = cachedCatalog;
                pityCatalogSource = '캐시';
            }
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5_000);
                let response;
                try {
                    response = await fetch('https://mg-api.ariedam.fr/data', {
                        method: 'GET', cache: 'no-store', credentials: 'omit', signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeout);
                }
                if (!response.ok) throw new Error(`API ${response.status}`);
                const live = normalizePityCatalog(await response.json());
                if (!live) throw new Error('천장 데이터 형식 오류');
                pityCatalog = live;
                pityCatalogSource = '최신 API';
                writeStored(PITY_CATALOG_CACHE_KEY, { savedAt: Date.now(), data: live });
            } catch (error) {
                if (!cachedCatalog) console.warn('[Snail/Pity] 최신 데이터 로드 실패, 내장 데이터 사용', error);
            }
            renderPityPage();
            return pityCatalog;
        })();
        return pityCatalogPromise;
    }

    function getPityOutcomes(eggId) {
        const egg = pityCatalog?.[eggId];
        if (!egg) return [];
        const species = Object.entries(egg.speciesPityThresholdPulls || {})
            .map(([id, threshold]) => ({
                key: `species:${id}`,
                type: 'species',
                id,
                label: PITY_KOREAN_NAMES[id] || id,
                chance: Number(egg.faunaSpawnWeights?.[id]) || 0,
                threshold: clampInt(threshold, 1)
            }))
            .sort((a, b) => a.chance - b.chance);
        const mutationThresholds = pityCatalog.mutationThresholds || FALLBACK_PITY_CATALOG.mutationThresholds;
        return [
            ...species,
            { key: 'mutation:Gold', type: 'mutation', id: 'Gold', label: 'Gold', chance: 1, threshold: clampInt(mutationThresholds.Gold, 1) },
            { key: 'mutation:Rainbow', type: 'mutation', id: 'Rainbow', label: 'Rainbow', chance: 0.1, threshold: clampInt(mutationThresholds.Rainbow, 1) }
        ];
    }

    function getPityCounter(account, eggId, key) {
        return clampInt(account?.counters?.[eggId]?.[key], 0);
    }

    function setPityCounter(account, eggId, key, value) {
        account.counters[eggId] ||= {};
        account.counters[eggId][key] = clampInt(value, 0);
    }

    function getPityStopReason(eggId) {
        if (!eggId) return null;
        const account = getPityAccountState(false);
        if (!account) return null;
        return getPityOutcomes(eggId)
            .map(outcome => ({ ...outcome, count: getPityCounter(account, eggId, outcome.key) }))
            .filter(outcome => outcome.count >= outcome.threshold - 1)
            .sort((a, b) => b.threshold - a.threshold)[0] || null;
    }

    function getActivityLogs(raw) {
        if (Array.isArray(raw)) return raw;
        for (const candidate of [raw?.activityLogs, raw?.activityLog, raw?.logs, raw?.data?.activityLogs]) {
            if (Array.isArray(candidate)) return candidate;
        }
        return [];
    }

    async function readPityActivityLogs() {
        const direct = await readAtom('myActivityLogAtom', undefined);
        const directLogs = getActivityLogs(direct);
        if (directLogs.length) return directLogs;
        return getActivityLogs(await readAtom('myDataAtom', null));
    }

    function pityLogKey(log) {
        const params = log?.parameters || {};
        const rawPet = params.pet || {};
        const pet = rawPet.slot || rawPet.item || rawPet;
        const timestamp = Number(log?.timestamp ?? log?.performedAt ?? log?.createdAt ?? 0);
        if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
        return [timestamp, log?.action || log?.type || '', params.eggId || '', pet.id || '', pet.petSpecies || ''].join('|');
    }

    function applyHatchToPity(account, log) {
        const params = log?.parameters || {};
        const eggId = String(params.eggId || '');
        const rawPet = params.pet || {};
        const pet = rawPet.slot || rawPet.item || rawPet;
        const species = String(pet.petSpecies || pet.species || '');
        if (!PITY_EGG_IDS.includes(eggId) || !pityCatalog?.[eggId] || !species) return false;
        const mutations = new Set((Array.isArray(pet.mutations) ? pet.mutations : [])
            .map(value => String(value || '').toLowerCase()));
        const hasRainbow = mutations.has('rainbow');
        const hasGold = !hasRainbow && (mutations.has('gold') || mutations.has('golden'));
        for (const outcome of getPityOutcomes(eggId)) {
            const hit = outcome.type === 'species'
                ? species.toLowerCase() === outcome.id.toLowerCase()
                : outcome.id === 'Rainbow'
                    ? hasRainbow
                    : hasGold;
            setPityCounter(account, eggId, outcome.key,
                hit ? 0 : getPityCounter(account, eggId, outcome.key) + 1);
        }
        const timestamp = clampInt(log?.timestamp ?? log?.performedAt ?? log?.createdAt ?? Date.now(), 0);
        account.lastCountedAt = timestamp || Date.now();
        account.lastResult = { eggId, species, mutations: [...mutations], at: account.lastCountedAt };
        pityHatchSequence++;
        pityHatchEvents.push({ sequence: pityHatchSequence, eggId, at: Date.now() });
        pityHatchEvents = pityHatchEvents.slice(-30);
        return true;
    }

    async function performPityActivityLogPoll({ initializeOnly = false } = {}) {
        const account = await ensurePityAccount();
        if (!account) return 0;
        const logs = (await readPityActivityLogs())
            .filter(log => log && typeof log === 'object')
            .sort((a, b) => Number(a.timestamp ?? a.performedAt ?? a.createdAt ?? 0) - Number(b.timestamp ?? b.performedAt ?? b.createdAt ?? 0));
        if (!account.logInitialized) {
            account.seenLogKeys = logs.map(pityLogKey).filter(Boolean).slice(-100);
            account.logInitialized = true;
            account.trackingStartedAt ||= Date.now();
            savePityState();
            renderPityPage();
            return 0;
        }
        if (initializeOnly) return 0;
        const seen = new Set(account.seenLogKeys);
        let counted = 0;
        let changed = false;
        for (const log of logs) {
            const action = String(log.action || log.type || '').toLowerCase();
            if (action !== 'hatchegg') continue;
            const key = pityLogKey(log);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            changed = true;
            if (applyHatchToPity(account, log)) counted++;
        }
        if (changed) {
            account.seenLogKeys = [...seen].slice(-100);
            savePityState();
            renderPityPage();
        }
        return counted;
    }

    async function pollPityActivityLogs(options = {}) {
        if (pityPollPromise) return pityPollPromise;
        pityPollPromise = performPityActivityLogPoll(options);
        try {
            return await pityPollPromise;
        } finally {
            pityPollPromise = null;
        }
    }

    async function refreshPityEggSlots() {
        const data = await readAtom('myDataAtom', null);
        const tileObjects = data?.garden?.tileObjects;
        if (!tileObjects || typeof tileObjects !== 'object') return;
        pityEggSlots.clear();
        for (const [slot, object] of Object.entries(tileObjects)) {
            if (object?.objectType !== 'egg' || !object.eggId) continue;
            const index = Number(slot);
            if (Number.isFinite(index)) pityEggSlots.set(index, String(object.eggId));
        }
    }

    async function preparePityTracking() {
        await getPityCatalog();
        const account = await ensurePityAccount();
        await pollPityActivityLogs({ initializeOnly: true });
        await refreshPityEggSlots();
        return !!account;
    }

    async function waitForPityHatch(eggId, afterSequence, timeoutMs = PITY_HATCH_LOG_TIMEOUT) {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
            await pollPityActivityLogs();
            if (pityHatchEvents.some(event => event.sequence > afterSequence && event.eggId === eggId)) return true;
            await sleep(100);
        }
        return false;
    }

    async function runPityTrackingTick() {
        if (pityTrackingBusy) return;
        pityTrackingBusy = true;
        try {
            await getPityCatalog();
            await ensurePityAccount();
            await Promise.all([pollPityActivityLogs(), refreshPityEggSlots()]);
        } catch (error) {
            console.warn('[Snail/Pity]', error);
        } finally {
            pityTrackingBusy = false;
            clearTimeout(pityTrackingTimer);
            pityTrackingTimer = setTimeout(runPityTrackingTick, document.hidden ? 2_000 : PITY_ACTIVITY_POLL_MS);
        }
    }

    function startPityTracker() {
        clearTimeout(pityTrackingTimer);
        runPityTrackingTick();
    }

    async function applyLegacyPityBonus() {
        await getPityCatalog();
        const account = await ensurePityAccount();
        if (!account) throw new Error('게임 계정을 확인하지 못했습니다.');
        account.legacyAccount = true;
        if (!account.legacyBonusApplied) {
            for (const eggId of PITY_EGG_IDS) {
                for (const outcome of getPityOutcomes(eggId)) {
                    setPityCounter(account, eggId, outcome.key,
                        Math.max(getPityCounter(account, eggId, outcome.key), Math.floor(outcome.threshold / 2)));
                }
            }
            account.legacyBonusApplied = true;
        }
        savePityState();
        renderPityPage();
        return account;
    }

    function extractInventoryItems(raw) {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.items)) return raw.items;
        if (Array.isArray(raw.inventory)) return raw.inventory;
        if (Array.isArray(raw.inventory?.items)) return raw.inventory.items;
        return [];
    }

    function collectEggInventory(raw) {
        const result = new Map();
        for (const entry of extractInventoryItems(raw)) {
            if (!entry || typeof entry !== 'object') continue;
            const item = entry.item && typeof entry.item === 'object' ? entry.item : entry;
            const itemType = String(item.itemType ?? item.data?.itemType ?? entry.itemType ?? '').toLowerCase();
            if (itemType !== 'egg') continue;
            const eggId = item.eggId ?? item.data?.eggId ?? entry.eggId;
            if (!eggId) continue;
            let quantity = 1;
            for (const candidate of [entry.quantity, entry.amount, entry.count, item.quantity, item.amount, item.count,
                item.data?.quantity, item.data?.amount, item.data?.count]) {
                const number = Number(candidate);
                if (Number.isFinite(number) && number > 0) {
                    quantity = Math.floor(number);
                    break;
                }
            }
            const id = String(eggId);
            result.set(id, (result.get(id) || 0) + quantity);
        }
        return [...result.entries()]
            .map(([eggId, count]) => ({ eggId, count }))
            .sort((a, b) => a.eggId.localeCompare(b.eggId));
    }

    function normalizeSlots(slots) {
        if (Array.isArray(slots)) return slots.map((slot, index) => ({ index, slot }));
        if (slots && typeof slots === 'object') {
            return Object.entries(slots).map(([key, slot], fallback) => {
                const number = Number(key);
                return { index: Number.isFinite(number) ? number : fallback, slot };
            });
        }
        return [];
    }

    async function scanGame() {
        const [map, state, inventory, myData, player] = await Promise.all([
            readAtom('mapAtom', null),
            readAtom('stateAtom', null),
            readAtom('myInventoryAtom', null),
            readAtom('myDataAtom', null),
            readAtom('playerAtom', null)
        ]);
        if (!map?.globalTileIdxToDirtTile) throw new Error('게임 Map 데이터를 읽지 못했습니다.');
        if (!state?.child?.data?.userSlots) throw new Error('게임 상태 데이터를 읽지 못했습니다.');

        const slots = normalizeSlots(state.child.data.userSlots);
        const playerIds = new Set([player?.id, player?.databaseUserId]
            .filter(value => value != null && String(value))
            .map(String));
        const matched = slots.find(({ slot }) => [
            slot?.playerId, slot?.id, slot?.databaseUserId,
            slot?.data?.playerId, slot?.data?.id, slot?.data?.databaseUserId
        ].filter(value => value != null).map(String).some(id => playerIds.has(id)));
        const userSlotIdx = Number.isFinite(Number(matched?.index)) ? Number(matched.index) : 0;
        const current = slots.find(item => Number(item.index) === userSlotIdx);
        const garden = myData?.garden ?? current?.slot?.data?.garden ?? current?.slot?.garden ?? {};
        const tileObjects = garden?.tileObjects || {};

        const dirtSet = new Set();
        for (const value of Object.values(map.globalTileIdxToDirtTile || {})) {
            if (!value || typeof value !== 'object' || Number(value.userSlotIdx) !== userSlotIdx) continue;
            const index = Number(value.dirtTileIdx);
            if (Number.isFinite(index) && index >= 0) dirtSet.add(index);
        }
        const allDirtSlots = [...dirtSet].sort((a, b) => a - b);
        const emptySlots = allDirtSlots.filter(index => !tileObjects[String(index)]);
        const eggTiles = Object.entries(tileObjects)
            .filter(([, object]) => object?.objectType === 'egg')
            .map(([slot, object]) => ({
                slot: Number(slot),
                eggId: String(object.eggId || ''),
                maturedAt: Number(object.maturedAt),
                raw: object
            }))
            .filter(item => Number.isFinite(item.slot))
            .sort((a, b) => a.slot - b.slot);

        pityEggSlots.clear();
        for (const egg of eggTiles) {
            if (egg.eggId) pityEggSlots.set(egg.slot, egg.eggId);
        }

        return {
            emptySlots,
            eggTiles,
            eggs: collectEggInventory(inventory)
        };
    }

    const eggCount = (scan, eggId) => scan.eggs.find(egg => egg.eggId === eggId)?.count || 0;
    const tileSignature = object => !object
        ? 'EMPTY'
        : [object.objectType ?? '', object.eggId ?? '', object.plantedAt ?? 0,
            object.maturedAt ?? 0, object.species ?? ''].join('|');

    async function getGardenTileFast(slot) {
        try {
            const atoms = getSharedAtoms();
            if (atoms?.data?.garden?.get) {
                const garden = await atoms.data.garden.get();
                return garden?.tileObjects?.[String(slot)] ?? null;
            }
        } catch {}
        try {
            const myData = await readAtom('myDataAtom', null);
            return myData?.garden?.tileObjects?.[String(slot)] ?? null;
        } catch {
            return null;
        }
    }

    async function waitForTileChange(slot, beforeSignature, timeoutMs, checkCancel = true) {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
            if (checkCancel && cancelRequested) return false;
            await sleep(8);
            try {
                const after = await getGardenTileFast(slot);
                if (tileSignature(after) !== beforeSignature) return true;
            } catch {}
        }
        return false;
    }

    function mergeEggPriority(eggs) {
        const ids = eggs.map(egg => egg.eggId);
        const priority = settings.egg.priority;
        priority.order = [
            ...priority.order.filter(id => ids.includes(id)),
            ...ids.filter(id => !priority.order.includes(id))
        ];
        for (const id of ids) {
            const previous = priority.config[id] || {};
            priority.config[id] = {
                enabled: previous.enabled !== false,
                reserve: clampInt(previous.reserve, 0),
                max: previous.max === '' || previous.max == null ? '' : clampInt(previous.max, 0)
            };
        }
    }

    function buildPriorityPlan(scan) {
        let free = scan.emptySlots.length;
        const rows = [];
        for (const id of settings.egg.priority.order) {
            if (free <= 0) break;
            const config = settings.egg.priority.config[id];
            if (!config?.enabled) continue;
            const owned = eggCount(scan, id);
            const usable = Math.max(0, owned - clampInt(config.reserve, 0, owned));
            const cap = config.max === '' || config.max == null
                ? usable
                : Math.min(usable, clampInt(config.max, 0));
            const amount = Math.min(free, cap);
            if (amount > 0) {
                rows.push({ eggId: id, amount });
                free -= amount;
            }
        }
        return { rows, total: scan.emptySlots.length - free };
    }

    function setStatus(text, kind = '') {
        const element = document.querySelector(`#${PANEL_ID} .snail-status`);
        if (!element) return;
        element.textContent = text || '';
        element.dataset.kind = kind;
        clearTimeout(statusTimer);
        if (text) {
            statusTimer = setTimeout(() => {
                if (element.textContent === text) {
                    element.textContent = '';
                    element.dataset.kind = '';
                }
            }, 8_000);
        }
    }

    function beginTask(name) {
        if (activeTask) return false;
        activeTask = name;
        cancelRequested = false;
        refreshActionButtons();
        return true;
    }

    function endTask() {
        activeTask = null;
        cancelRequested = false;
        refreshActionButtons();
    }

    async function plantOne(eggId, slot) {
        const before = await getGardenTileFast(slot);
        const signature = tileSignature(before);
        sendGame({ type: 'GrowEgg', slot, eggId });
        return await waitForTileChange(slot, signature, 500);
    }

    async function autoPlantOnce({ silent = true } = {}) {
        if (!settings.autoPlant || activeTask) return 0;
        if (!beginTask('plant')) return 0;
        let done = 0;
        try {
            const scan = await scanGame();
            if (!scan.emptySlots.length || !scan.eggs.length) return 0;
            mergeEggPriority(scan.eggs);
            if (!scan.eggs.some(egg => egg.eggId === settings.egg.single.eggId)) {
                settings.egg.single.eggId = scan.eggs[0].eggId;
                saveSettings();
            }

            const plan = settings.egg.mode === 'priority'
                ? buildPriorityPlan(scan)
                : (() => {
                    const id = settings.egg.single.eggId;
                    const owned = eggCount(scan, id);
                    const reserve = clampInt(settings.egg.single.reserve, 0, owned);
                    const amount = Math.min(scan.emptySlots.length, Math.max(0, owned - reserve));
                    return { rows: amount ? [{ eggId: id, amount }] : [], total: amount };
                })();

            const slots = scan.emptySlots.slice(0, plan.total);
            let slotIndex = 0;
            for (const row of plan.rows) {
                for (let i = 0; i < row.amount; i++) {
                    if (cancelRequested || !settings.autoPlant) return done;
                    const slot = slots[slotIndex++];
                    if (!Number.isFinite(slot)) return done;
                    setStatus(`알 심는 중 ${done + 1}/${plan.total}`);
                    if (!await plantOne(row.eggId, slot)) {
                        if (!cancelRequested) throw new Error(`${row.eggId} 알 심기 확인 실패`);
                        return done;
                    }
                    done++;
                    await sleep(5);
                }
            }
            if (done) setStatus(`알 심기 완료 ${done}개`, 'ok');
            return done;
        } catch (error) {
            if (!silent) setStatus(error?.message || String(error), 'error');
            else console.warn('[Snail/AutoPlant]', error);
            return done;
        } finally {
            endTask();
        }
    }

    function getCurrentPresetId() {
        return String(lastAppliedTeamId || readStored(LAST_TEAM_KEY, '') || '');
    }

    async function applyPetTeam(teamId) {
        const id = String(teamId || '').trim();
        if (!id) return false;
        sendGame({ type: 'ApplyPetTeam', teamId: id });
        rememberTeamId(id);
        await sleep(8);
        return true;
    }

    async function withPreset(teamId, restore, action) {
        if (!settings.pets.usePresetSwitch) return await action();
        const original = getCurrentPresetId();
        const target = String(teamId || '').trim();
        try {
            if (target) await applyPetTeam(target);
            return await action();
        } finally {
            if (restore && original && original !== target) {
                try { await applyPetTeam(original); } catch {}
            }
        }
    }

    async function hatchAll() {
        if (activeTask === 'hatch') {
            cancelRequested = true;
            setStatus('부화 중지 요청');
            return;
        }
        if (!beginTask('hatch')) return;
        let done = 0;
        let total = 0;
        let skipped = 0;
        let stoppedReason = '';
        lastHatchServerError = null;
        try {
            setStatus('부화 가능한 알 확인 중...');
            const canTrackPity = await preparePityTracking();
            const hatchTeamId = settings.pity.stopBeforePity && settings.pets.pityTeamId
                ? settings.pets.pityTeamId
                : settings.pets.hatchTeamId;
            await withPreset(hatchTeamId, settings.pets.restoreAfterHatch, async () => {
                const scan = await scanGame();
                const targets = scan.eggTiles.filter(egg => Number.isFinite(egg.maturedAt) && egg.maturedAt <= Date.now());
                total = targets.length;
                if (!total) {
                    setStatus('부화 가능한 알이 없습니다.');
                    return;
                }
                for (const egg of targets) {
                    if (cancelRequested) break;
                    const pityStop = settings.pity.stopBeforePity ? getPityStopReason(egg.eggId) : null;
                    if (pityStop) {
                        skipped++;
                        stoppedReason ||= `${pityCatalog?.[egg.eggId]?.name || egg.eggId} ${pityStop.label} ${pityStop.count}/${pityStop.threshold}`;
                        continue;
                    }
                    const signature = tileSignature(egg.raw);
                    setStatus(`부화 중 ${done + 1}/${total}`);
                    const beforePitySequence = pityHatchSequence;
                    sendGame({ type: 'HatchEgg', slot: egg.slot });
                    const changed = await waitForTileChange(egg.slot, signature, 900);
                    if (!changed) {
                        stoppedReason = lastHatchServerError && Date.now() - lastHatchServerError.at < 2_000
                            ? lastHatchServerError.reason
                            : '부화 확인 실패';
                        break;
                    }
                    done++;
                    if (settings.pity.stopBeforePity && canTrackPity && PITY_EGG_IDS.includes(egg.eggId) &&
                        !await waitForPityHatch(egg.eggId, beforePitySequence)) {
                        stoppedReason = '천장 기록 확인 실패';
                        break;
                    }
                    await sleep(5);
                }
            });
            if (cancelRequested) setStatus(`부화 중지 · ${done}/${total}`, 'error');
            else if (stoppedReason) setStatus(`부화 중지 · ${done}/${total} · ${stoppedReason}`, 'error');
            else if (total) setStatus(`부화 완료 ${done}개${skipped ? ` · 천장 대기 ${skipped}개` : ''}`, 'ok');
        } catch (error) {
            setStatus(error?.message || String(error), 'error');
        } finally {
            endTask();
        }
    }

    async function getPetInventorySnapshot() {
        const inventory = await readAtom('myInventoryAtom', null) || {};
        const favorites = new Set((Array.isArray(inventory.favoritedItemIds) ? inventory.favoritedItemIds : [])
            .filter(value => typeof value === 'string'));
        const pets = (Array.isArray(inventory.items) ? inventory.items : [])
            .filter(item => item &&
                String(item.itemType || '').toLowerCase() === 'pet' &&
                typeof item.id === 'string' &&
                item.id &&
                !favorites.has(item.id))
            .map(item => ({ ...item }));
        return { pets };
    }

    const PET_CATALOG_CACHE_KEY = 'snails-mod.pet-catalog.v1';
    const PET_CATALOG_CACHE_MS = 6 * 60 * 60 * 1_000;

    function normalizePetCatalog(raw) {
        const source = raw?.pets ?? raw;
        if (Array.isArray(source)) {
            const output = {};
            for (const entry of source) {
                const key = String(entry?.id ?? entry?.petSpecies ?? entry?.species ?? entry?.name ?? '').trim();
                if (key) output[key] = entry;
            }
            return Object.keys(output).length ? output : null;
        }
        return source && typeof source === 'object' ? source : null;
    }

    async function getPetCatalogData() {
        try {
            for (const source of [PageWindow.MGData, window.MGData].filter(Boolean)) {
                if (typeof source?.get !== 'function') continue;
                const normalized = normalizePetCatalog(await source.get('pets'));
                if (normalized) return normalized;
            }
        } catch {}
        try {
            const cached = readStored(PET_CATALOG_CACHE_KEY, null);
            if (cached && Date.now() - Number(cached.savedAt) < PET_CATALOG_CACHE_MS) {
                const normalized = normalizePetCatalog(cached.data);
                if (normalized) return normalized;
            }
        } catch {}
        try {
            const response = await fetch('https://mg-api.ariedam.fr/data', {
                method: 'GET', cache: 'no-store', credentials: 'omit'
            });
            if (response.ok) {
                const normalized = normalizePetCatalog(await response.json());
                if (normalized) {
                    writeStored(PET_CATALOG_CACHE_KEY, { savedAt: Date.now(), data: normalized });
                    return normalized;
                }
            }
        } catch {}
        return null;
    }

    function readPetStrength(pet, catalog) {
        const species = String(pet?.petSpecies ?? pet?.species ?? pet?.petId ?? '').trim();
        if (!species || !catalog) return null;
        let entry = catalog[species];
        if (!entry) {
            const key = Object.keys(catalog).find(value => String(value).toLowerCase() === species.toLowerCase());
            if (key) entry = catalog[key];
        }
        const maxScale = Number(entry?.maxScale ?? entry?.max_scale ?? entry?.scaleMax);
        const matureHours = Number(entry?.hoursToMature ?? entry?.hours_to_mature ?? entry?.maturityHours);
        if (!Number.isFinite(maxScale) || maxScale <= 1 || !Number.isFinite(matureHours) || matureHours <= 0) return null;
        const rawScale = Number(pet?.targetScale ?? pet?.scale ?? pet?.target_scale);
        const targetScale = Number.isFinite(rawScale) ? rawScale : 1;
        const rawXp = Number(pet?.xp ?? pet?.experience ?? 0);
        const xp = Number.isFinite(rawXp) ? Math.max(0, rawXp) : 0;
        const ratio = clamp((targetScale - 1) / (maxScale - 1), 0, 1);
        const maximum = Math.floor(ratio * 20 + 80);
        const current = Math.min(maximum - 30 + Math.min(Math.floor(xp / (matureHours * 3_600) * 30), 30), maximum);
        return { current, maximum, text: current >= maximum ? `STR ${maximum}` : `STR ${current}/${maximum}` };
    }

    function classifyPetForSale(pet, catalog) {
        const reasons = [];
        const strength = readPetStrength(pet, catalog);
        if (settings.pets.useSaleProtection) {
            const mutations = (Array.isArray(pet?.mutations) ? pet.mutations : [])
                .map(value => String(value || '').trim().toLowerCase());
            if (settings.pets.protectGold && mutations.includes('gold')) reasons.push('Gold');
            if (settings.pets.protectRainbow && mutations.includes('rainbow')) reasons.push('Rainbow');
            if (settings.pets.protectStr) {
                if (!strength) reasons.push('STR 확인 불가');
                else if (strength.maximum >= clampInt(settings.pets.strThreshold, 0, 100)) {
                    reasons.push(`최대 STR ${strength.maximum} ≥ ${settings.pets.strThreshold}`);
                }
            }
        }
        return {
            pet,
            protected: reasons.length > 0,
            reasons,
            strengthText: strength?.text || 'STR 확인 불가'
        };
    }

    async function sellPets(targets) {
        if (!targets.length || !beginTask('sell')) return;
        let sold = 0;
        try {
            const catalog = await getPetCatalogData();
            await withPreset(settings.pets.sellTeamId, settings.pets.restoreAfterSell, async () => {
                for (const target of targets) {
                    if (cancelRequested) break;
                    const snapshot = await getPetInventorySnapshot();
                    const current = snapshot.pets.find(pet => pet.id === target.id);
                    if (!current || classifyPetForSale(current, catalog).protected) continue;
                    sendGame({ type: 'SellPet', itemId: current.id });
                    sold++;
                    await sleep(20);
                }
            });
            setStatus(`판매 완료 ${sold}마리`, 'ok');
        } catch (error) {
            setStatus(error?.message || String(error), 'error');
        } finally {
            endTask();
        }
    }

    async function openSellPetsDialog() {
        if (activeTask) return;
        setStatus('인벤토리 펫 확인 중...');
        try {
            const snapshot = await getPetInventorySnapshot();
            if (!snapshot.pets.length) {
                setStatus('판매 가능한 펫이 없습니다.');
                return;
            }
            const catalog = await getPetCatalogData();
            const classified = snapshot.pets.map(pet => classifyPetForSale(pet, catalog));
            const protectedPets = classified.filter(item => item.protected);
            const sellablePets = classified.filter(item => !item.protected);
            if (!sellablePets.length) {
                setStatus(
                    protectedPets.length
                        ? `판매 보호된 펫 ${protectedPets.length}마리 · 판매 대상 없음`
                        : '판매 가능한 펫이 없습니다.',
                    protectedPets.length ? 'ok' : ''
                );
                return;
            }
            if (!settings.pets.confirmBeforeSell) {
                setStatus(`펫 판매 시작 ${sellablePets.length}마리`);
                await sellPets(sellablePets.map(item => item.pet));
                return;
            }
            const box = openModal('💰 펫 안전 판매');
            box.insertAdjacentHTML('beforeend', `
                <div class="snail-summary"><span>판매 대상</span><b>${sellablePets.length}마리</b></div>
                <div class="snail-info">즐겨찾기와 보호 조건에 해당하는 펫은 자동 제외됩니다.</div>
                <div class="snail-list">
                    ${sellablePets.map((item, index) => `
                        <label class="snail-pet-row">
                            <input class="snail-sell-check" type="checkbox" data-index="${index}" checked>
                            <span><b>${escapeHtml(item.pet.name || item.pet.petSpecies || 'Pet')}</b>
                            <small>${escapeHtml(item.pet.petSpecies || '')} · ${escapeHtml(item.strengthText)}</small></span>
                        </label>`).join('') || '<div class="snail-warning">판매 가능한 펫이 없습니다.</div>'}
                </div>
                ${protectedPets.length ? `
                    <div class="snail-section-title">보호된 펫 ${protectedPets.length}마리</div>
                    <div class="snail-list protected">
                        ${protectedPets.map(item => `<div class="snail-protected-row"><b>${escapeHtml(item.pet.name || item.pet.petSpecies || 'Pet')}</b><small>${escapeHtml(item.reasons.join(' · '))}</small></div>`).join('')}
                    </div>` : ''}
                <div class="snail-modal-actions">
                    <button data-close>취소</button>
                    <button class="primary snail-sell-start">판매 시작</button>
                </div>`);
            box.querySelector('[data-close]').onclick = closeModal;
            const start = box.querySelector('.snail-sell-start');
            const refresh = () => {
                const count = box.querySelectorAll('.snail-sell-check:checked').length;
                start.disabled = count <= 0;
                start.textContent = count ? `판매 시작 (${count})` : '판매 시작';
            };
            box.querySelectorAll('.snail-sell-check').forEach(input => input.onchange = refresh);
            refresh();
            start.onclick = async () => {
                const selected = [...box.querySelectorAll('.snail-sell-check:checked')]
                    .map(input => sellablePets[Number(input.dataset.index)]?.pet)
                    .filter(Boolean);
                closeModal();
                await sellPets(selected);
            };
        } catch (error) {
            setStatus(error?.message || String(error), 'error');
        }
    }

    // ---------------------------------------------------------------------
    // 설정 패널과 이동 가능한 달팽이 아이콘을 표시하는 기능
    // ---------------------------------------------------------------------
    function installStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${ICON_ID}{position:fixed;width:${BUTTON_SIZE}px;height:${BUTTON_SIZE}px;z-index:2147483644;display:flex;align-items:center;justify-content:center;padding:0;border-radius:50%;border:1px solid #32404e;background:linear-gradient(180deg,#111923,#0b131c);box-shadow:0 10px 28px rgba(0,0,0,.45);color:#fff;font:22px/1 sans-serif;cursor:grab;user-select:none;touch-action:none}
            #${ICON_ID}:active{cursor:grabbing}
            #${PANEL_ID}{position:fixed;z-index:2147483643;width:min(292px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow-y:auto;box-sizing:border-box;padding:12px;border:1px solid #32404e;border-radius:12px;background:rgba(11,19,28,.96);box-shadow:0 14px 38px rgba(0,0,0,.55);color:#eef4fb;font:12px/1.35 Arial,sans-serif;backdrop-filter:blur(8px);scrollbar-width:thin}
            #${PANEL_ID}[hidden]{display:none!important}
            #${PANEL_ID} *{box-sizing:border-box}
            #${PANEL_ID} .snail-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:9px}
            #${PANEL_ID} .snail-title{flex:1;min-width:0;font-size:14px;font-weight:800;cursor:grab;touch-action:none;white-space:nowrap}
            #${PANEL_ID} .snail-title:active{cursor:grabbing}
            #${PANEL_ID} .snail-head-controls{display:flex;align-items:center;gap:1px}
            #${PANEL_ID} .snail-page-nav,#${PANEL_ID} .snail-close{min-height:26px;height:26px;padding:0;border:0;background:transparent;color:#aeb8c5;cursor:pointer}
            #${PANEL_ID} .snail-page-nav{width:21px;font-size:11px}
            #${PANEL_ID} .snail-page-indicator{width:24px;color:#8f9baa;text-align:center;font-size:9px}
            #${PANEL_ID} .snail-close{width:26px;height:26px;padding:0;border:0;background:transparent;color:#aeb8c5;font-size:20px;cursor:pointer}
            #${PANEL_ID} .snail-page[hidden]{display:none!important}
            #${PANEL_ID} .snail-toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08)}
            #${PANEL_ID} .snail-toggle span{display:grid;gap:2px}
            #${PANEL_ID} .snail-toggle small{color:#8f9baa;font-size:10px}
            #${PANEL_ID} input[type=checkbox]{flex:none;accent-color:#66d18e;width:17px;height:17px}
            #${PANEL_ID} .snail-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
            #${PANEL_ID} button,.snail-modal button{min-height:31px;padding:5px 8px;border:1px solid rgba(255,255,255,.14);border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font:700 11px Arial,sans-serif;cursor:pointer}
            #${PANEL_ID} button:hover,.snail-modal button:hover{background:rgba(255,255,255,.15)}
            #${PANEL_ID} button:disabled,.snail-modal button:disabled{opacity:.4;cursor:default}
            #${PANEL_ID} .snail-status{min-height:16px;margin-top:7px;color:#cbd5e1;text-align:center;font-size:10px}
            #${PANEL_ID} .snail-status[data-kind=ok]{color:#8ff0ad}
            #${PANEL_ID} .snail-status[data-kind=error]{color:#ff9b9b}
            #${PANEL_ID} .snail-pet-settings{display:none;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1)}
            #${PANEL_ID}.show-pet-settings .snail-pet-settings{display:block}
            #${PANEL_ID} .snail-setting{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}
            #${PANEL_ID} .snail-setting input[type=text],#${PANEL_ID} .snail-setting input[type=number]{width:116px;height:28px;padding:4px 6px;border:1px solid rgba(255,255,255,.15);border-radius:5px;background:#111923;color:#fff;font-size:11px}
            #${PANEL_ID} .snail-pet-group{margin-top:8px}
            #${PANEL_ID} .snail-master-card{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px;border:1px solid rgba(130,175,220,.36);border-radius:8px;background:rgba(62,104,145,.12)}
            #${PANEL_ID} .snail-group-toggle{display:grid;grid-template-columns:14px 1fr;align-items:center;gap:3px;flex:1;min-width:0;min-height:0;padding:0;border:0;background:transparent;text-align:left}
            #${PANEL_ID} .snail-group-toggle:hover{background:transparent}
            #${PANEL_ID} .snail-group-toggle>span:last-child{display:grid;gap:2px}
            #${PANEL_ID} .snail-group-toggle small{color:#8f9baa;font-size:9px;font-weight:400}
            #${PANEL_ID} .snail-group-chevron{color:#8fa8c1;font-size:10px;transition:transform .14s ease}
            #${PANEL_ID} .snail-collapsible.is-collapsed .snail-group-chevron{transform:rotate(-90deg)}
            #${PANEL_ID} .snail-collapsible.is-collapsed .snail-subsettings{display:none}
            #${PANEL_ID} .snail-subsettings{margin:0 0 7px 7px;padding:3px 0 2px 9px;border-left:2px solid rgba(130,175,220,.32)}
            #${PANEL_ID} .snail-subsettings.is-disabled{opacity:.42}
            #${PANEL_ID} .snail-popup-help{padding-top:7px;color:#9aa8b8;font-size:9px;line-height:1.45}
            #${PANEL_ID} .snail-interval-setting{padding-top:7px}
            #${PANEL_ID} .snail-interval-value{display:flex;align-items:center;gap:5px;color:#9aa8b8}
            #${PANEL_ID} .snail-interval-value input{width:76px;height:28px;padding:4px 6px;border:1px solid rgba(255,255,255,.15);border-radius:5px;background:#111923;color:#fff;font-size:11px}
            #${PANEL_ID} .snail-preset-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px;width:164px}
            #${PANEL_ID} .snail-preset-row input[type=text]{width:100%}
            #${PANEL_ID} .snail-preset-row button{min-height:28px;padding:3px 5px;font-size:9px;white-space:nowrap}
            #${PANEL_ID} .snail-current-preset{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#b8c8da;font-size:9px}
            #${PANEL_ID} .snail-feed-help{margin:5px 0 0;color:#8f9baa;font-size:9px;line-height:1.4}
            #${PANEL_ID} .snail-page-intro{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin:2px 0 8px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.1)}
            #${PANEL_ID} .snail-page-intro small{color:#8f9baa;text-align:right;font-size:9px}
            #${PANEL_ID} .snail-pity-eggs{display:grid;gap:2px}
            #${PANEL_ID} .snail-pity-list{padding-top:5px}
            #${PANEL_ID} .snail-pity-row{display:grid;gap:4px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.055)}
            #${PANEL_ID} .snail-pity-row:last-child{border-bottom:0}
            #${PANEL_ID} .snail-pity-row-head{display:flex;align-items:center;justify-content:space-between;gap:5px}
            #${PANEL_ID} .snail-pity-row-head>span{display:flex;align-items:center;gap:5px}
            #${PANEL_ID} .snail-pity-row-head small{color:#93a4b7;font-size:9px}
            #${PANEL_ID} .snail-pity-row-head code{color:#d8e6f6;font-size:10px}
            #${PANEL_ID} .snail-pity-row-head button{min-height:22px;padding:2px 6px;font-size:9px}
            #${PANEL_ID} .snail-pity-bar{height:4px;overflow:hidden;border-radius:9px;background:rgba(255,255,255,.09)}
            #${PANEL_ID} .snail-pity-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#60a5fa,#a78bfa)}
            #${PANEL_ID} .snail-pity-foot{margin-top:9px;color:#8f9baa;font-size:9px;line-height:1.45}
            #${PANEL_ID} .snail-setting-label{display:grid;gap:1px}
            #${PANEL_ID} .snail-setting-label small,#${PANEL_ID} .snail-legacy-state{color:#8f9baa;font-size:9px}
            #${PANEL_ID} .snail-backup-actions{display:grid;gap:7px;margin-top:10px}
            #${PANEL_ID} .snail-backup-actions button{min-height:38px}
            #${PANEL_ID} .snail-backup-meta{margin-top:9px;padding:8px;border-radius:7px;background:rgba(255,255,255,.05);color:#aab6c5;font-size:9px;line-height:1.5}
            .snail-hide-feed-widget{position:fixed!important;left:-10000px!important;top:-10000px!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
            .snail-overlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(0,0,0,.48);font-family:Arial,sans-serif}
            .snail-modal{width:min(460px,calc(100vw - 20px));max-height:calc(100vh - 20px);overflow:auto;box-sizing:border-box;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:11px;background:#20242b;color:#fff;font:11px/1.35 Arial,sans-serif;box-shadow:0 15px 50px rgba(0,0,0,.5)}
            .snail-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:14px}
            .snail-summary{display:flex;justify-content:space-between;padding:8px;margin-bottom:8px;border-radius:7px;background:rgba(255,255,255,.06)}
            .snail-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:9px}
            .snail-tabs button.active{background:rgba(95,180,255,.24);border-color:rgba(110,190,255,.45)}
            .snail-field{display:grid;gap:4px;margin:7px 0;color:#c4ceda}
            .snail-field input,.snail-field select{width:100%;height:30px;padding:4px 7px;border:1px solid rgba(255,255,255,.15);border-radius:6px;background:#15181d;color:#fff;font:11px Arial,sans-serif}
            .snail-priority-list,.snail-list{display:grid;gap:5px;max-height:280px;overflow:auto}
            .snail-priority-row{display:grid;grid-template-columns:20px 30px minmax(74px,1fr) 54px 54px;gap:5px;align-items:center;padding:6px;border-radius:6px;background:rgba(255,255,255,.045)}
            .snail-pr-order{display:grid;gap:2px}
            .snail-pr-order button{min-height:14px;height:14px;padding:0;border-radius:3px;font-size:8px;line-height:1}
            .snail-priority-row small,.snail-pet-row small,.snail-protected-row small{display:block;color:#9ca8b5;font-size:9px}
            .snail-priority-row input[type=number]{width:100%;height:27px;border:1px solid rgba(255,255,255,.14);border-radius:5px;background:#15181d;color:#fff}
            .snail-info,.snail-warning{margin:7px 0;padding:7px 8px;border-radius:6px;background:rgba(255,255,255,.055);color:#cbd3dd}
            .snail-warning{border:1px solid rgba(255,190,90,.35);color:#ffd9a0}
            .snail-modal-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:10px}
            .snail-modal-actions .primary{background:rgba(80,160,235,.28)}
            .snail-pet-row{display:grid;grid-template-columns:20px 1fr;gap:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,.045)}
            .snail-section-title{margin:10px 0 6px;padding-top:8px;border-top:1px solid rgba(255,255,255,.09);font-weight:800}
            .snail-protected-row{padding:6px;border-radius:6px;background:rgba(180,70,70,.1);border:1px solid rgba(255,120,120,.15)}
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function closeModal() {
        modal?.remove();
        modal = null;
    }

    function openModal(title) {
        closeModal();
        const overlay = document.createElement('div');
        overlay.className = 'snail-overlay';
        const box = document.createElement('div');
        box.className = 'snail-modal';
        box.innerHTML = `<div class="snail-modal-head"><b>${escapeHtml(title)}</b><span>Esc로 닫기</span></div>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        overlay.addEventListener('pointerdown', event => {
            if (event.target === overlay && !activeTask) closeModal();
        });
        modal = overlay;
        return box;
    }

    async function openEggSettings() {
        if (activeTask) return;
        setStatus('알 목록 확인 중...');
        try {
            const scan = await scanGame();
            if (!scan.eggs.length) {
                setStatus('보유 중인 알이 없습니다.', 'error');
                return;
            }
            mergeEggPriority(scan.eggs);
            if (!scan.eggs.some(egg => egg.eggId === settings.egg.single.eggId)) {
                settings.egg.single.eggId = scan.eggs[0].eggId;
            }
            const box = openModal('🥚 알 자동 심기 설정');
            const render = () => {
                box.querySelectorAll('.snail-dialog-body').forEach(node => node.remove());
                box.insertAdjacentHTML('beforeend', `
                    <div class="snail-dialog-body">
                        <div class="snail-summary"><span>현재 빈 공간</span><b>${scan.emptySlots.length}칸</b></div>
                        <div class="snail-tabs">
                            <button data-mode="single" class="${settings.egg.mode === 'single' ? 'active' : ''}">단일 알</button>
                            <button data-mode="priority" class="${settings.egg.mode === 'priority' ? 'active' : ''}">우선순위</button>
                        </div>
                        ${settings.egg.mode === 'single' ? `
                            <label class="snail-field">알 종류
                                <select class="snail-egg-select">${scan.eggs.map(egg => `<option value="${escapeHtml(egg.eggId)}" ${egg.eggId === settings.egg.single.eggId ? 'selected' : ''}>${escapeHtml(egg.eggId)} · ${egg.count}개</option>`).join('')}</select>
                            </label>
                            <label class="snail-field">남길 수량
                                <input class="snail-single-reserve" type="number" min="0" max="${eggCount(scan, settings.egg.single.eggId)}" value="${clampInt(settings.egg.single.reserve, 0, eggCount(scan, settings.egg.single.eggId))}">
                            </label>` : `
                            <div class="snail-priority-list">
                                ${settings.egg.priority.order.map((id, index) => {
                                    const egg = scan.eggs.find(item => item.eggId === id);
                                    if (!egg) return '';
                                    const config = settings.egg.priority.config[id];
                                    return `<div class="snail-priority-row" data-id="${escapeHtml(id)}">
                                        <input class="snail-pr-enabled" type="checkbox" ${config.enabled ? 'checked' : ''}>
                                        <span class="snail-pr-order"><button class="snail-pr-up" ${index === 0 ? 'disabled' : ''}>▲</button><button class="snail-pr-down" ${index === settings.egg.priority.order.length - 1 ? 'disabled' : ''}>▼</button></span>
                                        <span><b>${escapeHtml(id)}</b><small>${egg.count}개</small></span>
                                        <label>남김<input class="snail-pr-reserve" type="number" min="0" max="${egg.count}" value="${clampInt(config.reserve, 0, egg.count)}"></label>
                                        <label>최대<input class="snail-pr-max" type="number" min="0" placeholder="∞" value="${config.max === '' ? '' : clampInt(config.max, 0)}"></label>
                                    </div>`;
                                }).join('')}
                            </div>`}
                        <div class="snail-info">자동 심기가 켜져 있으면 빈 공간을 감지해 위 규칙대로 채웁니다.</div>
                        <div class="snail-modal-actions">
                            <button data-close>취소</button>
                            <button class="primary snail-save-egg">저장</button>
                        </div>
                    </div>`);
                box.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => {
                    settings.egg.mode = button.dataset.mode;
                    render();
                });
                box.querySelector('[data-close]').onclick = closeModal;
                box.querySelector('.snail-egg-select')?.addEventListener('change', event => {
                    settings.egg.single.eggId = event.target.value;
                });
                box.querySelector('.snail-single-reserve')?.addEventListener('input', event => {
                    settings.egg.single.reserve = clampInt(event.target.value, 0, eggCount(scan, settings.egg.single.eggId));
                });
                box.querySelectorAll('.snail-priority-row').forEach(row => {
                    const config = settings.egg.priority.config[row.dataset.id];
                    row.querySelector('.snail-pr-enabled').onchange = event => config.enabled = event.target.checked;
                    const move = direction => {
                        const order = settings.egg.priority.order;
                        const from = order.indexOf(row.dataset.id);
                        const to = from + direction;
                        if (from < 0 || to < 0 || to >= order.length) return;
                        [order[from], order[to]] = [order[to], order[from]];
                        render();
                    };
                    row.querySelector('.snail-pr-up').onclick = () => move(-1);
                    row.querySelector('.snail-pr-down').onclick = () => move(1);
                    row.querySelector('.snail-pr-reserve').oninput = event => config.reserve = clampInt(event.target.value, 0);
                    row.querySelector('.snail-pr-max').oninput = event => {
                        config.max = event.target.value.trim() === '' ? '' : clampInt(event.target.value, 0);
                    };
                });
                box.querySelector('.snail-save-egg').onclick = () => {
                    saveSettings();
                    closeModal();
                    setStatus('알 자동 심기 설정 저장됨', 'ok');
                    if (settings.autoPlant) autoPlantOnce({ silent: false });
                };
            };
            render();
            setStatus('');
        } catch (error) {
            setStatus(error?.message || String(error), 'error');
        }
    }

    function refreshPresetDisplay() {
        const element = document.querySelector(`#${PANEL_ID} .snail-current-preset`);
        if (element) element.textContent = getCurrentPresetId() || '감지되지 않음';
    }

    function refreshPetGroupStates(panel) {
        for (const group of panel.querySelectorAll('.snail-subsettings[data-depends-on]')) {
            const master = panel.querySelector(`[data-pet-setting="${group.dataset.dependsOn}"]`);
            const enabled = !!master?.checked;
            group.classList.toggle('is-disabled', !enabled);
            group.querySelectorAll('input,button').forEach(control => control.disabled = !enabled);
        }
    }

    function syncSectionCollapse(panel) {
        const collapsed = new Set(settings.ui.collapsedSections);
        for (const group of panel.querySelectorAll('.snail-collapsible[data-collapse-key]')) {
            const isCollapsed = collapsed.has(group.dataset.collapseKey);
            group.classList.toggle('is-collapsed', isCollapsed);
            group.querySelector('.snail-group-toggle')?.setAttribute('aria-expanded', String(!isCollapsed));
        }
    }

    function toggleSection(panel, group) {
        const collapsed = new Set(settings.ui.collapsedSections);
        const key = group.dataset.collapseKey;
        collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
        settings.ui.collapsedSections = [...collapsed];
        saveSettings();
        syncSectionCollapse(panel);
    }

    function syncPetSettingsUI(panel) {
        const setChecked = (name, value) => {
            const input = panel.querySelector(`[data-pet-setting="${name}"]`);
            if (input) input.checked = !!value;
        };
        const setValue = (name, value) => {
            const input = panel.querySelector(`[data-pet-setting="${name}"]`);
            if (input) input.value = value ?? '';
        };
        setChecked('usePresetSwitch', settings.pets.usePresetSwitch);
        setValue('hatchTeamId', settings.pets.hatchTeamId);
        setValue('pityTeamId', settings.pets.pityTeamId);
        setValue('sellTeamId', settings.pets.sellTeamId);
        setChecked('restoreAfterHatch', settings.pets.restoreAfterHatch);
        setChecked('restoreAfterSell', settings.pets.restoreAfterSell);
        setChecked('useSaleProtection', settings.pets.useSaleProtection);
        setChecked('protectGold', settings.pets.protectGold);
        setChecked('protectRainbow', settings.pets.protectRainbow);
        setChecked('protectStr', settings.pets.protectStr);
        setValue('strThreshold', settings.pets.strThreshold);
        setChecked('confirmBeforeSell', settings.pets.confirmBeforeSell);
        const pityStop = panel.querySelector('[data-pity-setting="stopBeforePity"]');
        if (pityStop) pityStop.checked = !!settings.pity.stopBeforePity;
        const account = getPityAccountState(false);
        const legacy = panel.querySelector('.snail-legacy-account');
        if (legacy) {
            legacy.checked = !!account?.legacyAccount;
            legacy.disabled = !account || !!account.legacyBonusApplied;
        }
        const legacyState = panel.querySelector('.snail-legacy-state');
        if (legacyState) {
            legacyState.textContent = !pityAccountId
                ? '게임 계정 연결 대기 중'
                : account?.legacyBonusApplied
                    ? '50% 보정 적용 완료'
                    : '체크하면 각 천장을 50%부터 시작';
        }
        refreshPresetDisplay();
        refreshPetGroupStates(panel);
        syncSectionCollapse(panel);
    }

    function setPanelPage(panel, page, persist = true) {
        const nextPage = clampInt(page, 1, 3);
        settings.ui.page = nextPage;
        panel.querySelectorAll('.snail-page').forEach(element => {
            element.hidden = Number(element.dataset.page) !== nextPage;
        });
        const indicator = panel.querySelector('.snail-page-indicator');
        if (indicator) indicator.textContent = `${nextPage}/3`;
        const previous = panel.querySelector('.snail-page-prev');
        const next = panel.querySelector('.snail-page-next');
        if (previous) previous.disabled = nextPage <= 1;
        if (next) next.disabled = nextPage >= 3;
        if (persist) saveSettings();
        if (nextPage === 2) renderPityPage(panel);
        if (!panel.hidden) {
            const rect = panel.getBoundingClientRect();
            panelPosition = constrainPanel(panel, rect.left, rect.top);
        }
    }

    function renderPityPage(panel = document.getElementById(PANEL_ID)) {
        const root = panel?.querySelector('.snail-pity-page-content');
        if (!root) return;
        const account = getPityAccountState(false);
        root.innerHTML = `
            <div class="snail-page-intro">
                <b>알별 천장 현황</b>
                <small>${escapeHtml(pityCatalogSource)} · 실제 부화 기록만 카운트</small>
            </div>
            ${!account ? '<div class="snail-warning">게임 계정을 확인하는 중입니다. 정원에 접속하면 자동으로 연결됩니다.</div>' : ''}
            <div class="snail-pity-eggs">
                ${PITY_EGG_IDS.map(eggId => {
                    const egg = pityCatalog?.[eggId] || FALLBACK_PITY_CATALOG[eggId];
                    const outcomes = getPityOutcomes(eggId);
                    const waiting = outcomes.filter(outcome => getPityCounter(account, eggId, outcome.key) >= outcome.threshold - 1).length;
                    return `<div class="snail-pet-group snail-collapsible" data-collapse-key="pity:${escapeHtml(eggId)}">
                        <div class="snail-master-card">
                            <button type="button" class="snail-group-toggle"><span class="snail-group-chevron">▼</span><span><b>${escapeHtml(egg?.name || eggId)}</b><small>${waiting ? `천장 대기 ${waiting}개` : '개체 · Gold · Rainbow'}</small></span></button>
                        </div>
                        <div class="snail-subsettings snail-pity-list">
                            ${outcomes.map(outcome => {
                                const count = getPityCounter(account, eggId, outcome.key);
                                const progress = Math.min(100, count / outcome.threshold * 100);
                                const waitingText = count >= outcome.threshold - 1 ? ' · 대기' : '';
                                return `<div class="snail-pity-row">
                                    <div class="snail-pity-row-head"><span><b>${escapeHtml(outcome.label)}</b><small>${outcome.chance}%${waitingText}</small></span><span><code>${count}/${outcome.threshold}</code><button type="button" data-pity-edit="${escapeHtml(eggId)}|${escapeHtml(outcome.key)}">수정</button></span></div>
                                    <div class="snail-pity-bar"><i style="width:${progress}%"></i></div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div class="snail-pity-foot">추가 부화 효과(Double Hatch)는 제외됩니다. 스크립트가 꺼져 있던 동안의 기록은 자동 복원되지 않으므로 필요하면 수동 수정하세요.</div>`;
        root.querySelectorAll('.snail-group-toggle').forEach(button => {
            button.onclick = () => toggleSection(panel, button.closest('.snail-collapsible'));
        });
        root.querySelectorAll('[data-pity-edit]').forEach(button => {
            button.onclick = () => {
                const separator = button.dataset.pityEdit.indexOf('|');
                openPityCounterEditor(
                    button.dataset.pityEdit.slice(0, separator),
                    button.dataset.pityEdit.slice(separator + 1)
                );
            };
        });
        syncSectionCollapse(panel);
    }

    async function openPityCounterEditor(eggId, outcomeKey) {
        await getPityCatalog();
        const account = await ensurePityAccount();
        const outcome = getPityOutcomes(eggId).find(item => item.key === outcomeKey);
        if (!account || !outcome) {
            setStatus('천장 데이터를 불러오지 못했습니다.', 'error');
            return;
        }
        const count = getPityCounter(account, eggId, outcome.key);
        const box = openModal(`${pityCatalog[eggId]?.name || eggId} · ${outcome.label}`);
        box.insertAdjacentHTML('beforeend', `
            <label class="snail-field">현재 실패 누적 횟수
                <input class="snail-pity-edit-value" type="number" min="0" step="1" value="${count}">
            </label>
            <div class="snail-info">0 이상을 입력할 수 있습니다. 게임의 실제 서버 천장은 바뀌지 않고 이 모드의 로컬 계산값만 수정됩니다.</div>
            <div class="snail-modal-actions"><button data-close>취소</button><button class="primary snail-pity-edit-save">확인</button></div>`);
        const input = box.querySelector('.snail-pity-edit-value');
        box.querySelector('[data-close]').onclick = closeModal;
        box.querySelector('.snail-pity-edit-save').onclick = () => {
            setPityCounter(account, eggId, outcome.key, clampInt(input.value, 0));
            account.lastCountedAt = Date.now();
            savePityState();
            closeModal();
            renderPityPage();
            setStatus(`${outcome.label} 천장 수치 저장됨`, 'ok');
        };
        input.focus();
        input.select();
    }

    async function exportSettingsFile() {
        await getPityCatalog();
        await ensurePityAccount();
        const account = getPityAccountState(false);
        const payload = {
            format: 'snails-hidden-mod-settings',
            schemaVersion: 1,
            scriptVersion: SCRIPT_VERSION,
            exportedAt: new Date().toISOString(),
            settings,
            pity: account ? {
                counters: account.counters,
                legacyAccount: account.legacyAccount,
                legacyBonusApplied: account.legacyBonusApplied,
                lastCountedAt: account.lastCountedAt,
                lastResult: account.lastResult
            } : null
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `snails-hidden-mod-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1_000);
        setStatus('설정 파일을 저장했습니다.', 'ok');
    }

    async function importSettingsFile(file, panel) {
        let payload;
        try {
            payload = JSON.parse(await file.text());
        } catch {
            throw new Error('올바른 JSON 설정 파일이 아닙니다.');
        }
        if (payload?.format !== 'snails-hidden-mod-settings' || payload.schemaVersion !== 1 ||
            !payload.settings || typeof payload.settings !== 'object') {
            throw new Error('Snail’s Hidden Mod 설정 파일 형식이 아닙니다.');
        }
        if (!confirm('현재 사용자 설정과 이 계정의 천장 계산값을 파일 내용으로 바꿀까요?')) return false;
        await getPityCatalog();
        const account = await ensurePityAccount();
        settings = normalizeSettings(payload.settings);
        saveSettings();
        if (account && payload.pity && typeof payload.pity === 'object') {
            const importedCounters = {};
            for (const eggId of PITY_EGG_IDS) {
                const source = payload.pity.counters?.[eggId];
                if (!source || typeof source !== 'object') continue;
                const allowed = new Set(getPityOutcomes(eggId).map(outcome => outcome.key));
                importedCounters[eggId] = Object.fromEntries(Object.entries(source)
                    .filter(([key, value]) => allowed.has(key) && Number.isFinite(Number(value)) && Number(value) >= 0)
                    .map(([key, value]) => [key, clampInt(value, 0)]));
            }
            account.counters = importedCounters;
            account.legacyAccount = !!payload.pity.legacyAccount;
            account.legacyBonusApplied = !!payload.pity.legacyBonusApplied;
            account.lastCountedAt = clampInt(payload.pity.lastCountedAt, 0);
            account.lastResult = payload.pity.lastResult && typeof payload.pity.lastResult === 'object'
                ? { ...payload.pity.lastResult }
                : null;
            account.logInitialized = false;
            account.seenLogKeys = [];
            account.trackingStartedAt = Date.now();
            savePityState();
            await pollPityActivityLogs({ initializeOnly: true });
        }
        panel.querySelector('.snail-auto-buy').checked = settings.autoBuy;
        panel.querySelector('.snail-auto-plant').checked = settings.autoPlant;
        panel.querySelector('.snail-auto-feed').checked = settings.autoFeed;
        panel.querySelectorAll('[data-interval-setting]').forEach(input => {
            input.value = String(Math.round(settings.intervals[input.dataset.intervalSetting] / 1_000));
        });
        syncPetSettingsUI(panel);
        setPanelPage(panel, settings.ui.page, false);
        for (const name of ['autoBuy', 'autoFeed']) rescheduleAutomation(name);
        settings.autoFeed ? checkAutoFeed({ announce: true }) : stopAutoFeed();
        setStatus('설정과 천장 계산값을 불러왔습니다.', 'ok');
        return true;
    }

    function refreshActionButtons() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const plant = panel.querySelector('.snail-egg-settings');
        const hatch = panel.querySelector('.snail-hatch');
        const sell = panel.querySelector('.snail-sell');
        plant.disabled = !!activeTask;
        hatch.disabled = !!activeTask && activeTask !== 'hatch';
        sell.disabled = !!activeTask;
        hatch.textContent = activeTask === 'hatch' ? '⛔ 부화 중지' : '🐣 모두 부화';
    }

    function constrainIcon(icon, left, top) {
        const maxLeft = Math.max(SCREEN_MARGIN, window.innerWidth - BUTTON_SIZE - SCREEN_MARGIN);
        const maxTop = Math.max(SCREEN_MARGIN, window.innerHeight - BUTTON_SIZE - SCREEN_MARGIN);
        const x = Math.round(clamp(Number(left) || SCREEN_MARGIN, SCREEN_MARGIN, maxLeft));
        const y = Math.round(clamp(Number(top) || SCREEN_MARGIN, SCREEN_MARGIN, maxTop));
        icon.style.left = `${x}px`;
        icon.style.top = `${y}px`;
        return { left: x, top: y };
    }

    function constrainPanel(panel, left, top) {
        const maxLeft = Math.max(SCREEN_MARGIN, window.innerWidth - panel.offsetWidth - SCREEN_MARGIN);
        const maxTop = Math.max(SCREEN_MARGIN, window.innerHeight - panel.offsetHeight - SCREEN_MARGIN);
        const position = {
            left: Math.round(clamp(Number(left) || SCREEN_MARGIN, SCREEN_MARGIN, maxLeft)),
            top: Math.round(clamp(Number(top) || SCREEN_MARGIN, SCREEN_MARGIN, maxTop))
        };
        panel.style.left = `${position.left}px`;
        panel.style.top = `${position.top}px`;
        return position;
    }

    function positionPanel(icon, panel) {
        if (panelPosition) {
            panelPosition = constrainPanel(panel, panelPosition.left, panelPosition.top);
            writeStored(PANEL_POSITION_KEY, panelPosition);
            return;
        }
        const iconRect = icon.getBoundingClientRect();
        const panelWidth = panel.offsetWidth || 292;
        const panelHeight = panel.offsetHeight || 360;
        let left = iconRect.right - panelWidth;
        let top = iconRect.bottom + 8;
        if (top + panelHeight > window.innerHeight - SCREEN_MARGIN) top = iconRect.top - panelHeight - SCREEN_MARGIN;
        left = clamp(left, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, window.innerWidth - panelWidth - SCREEN_MARGIN));
        top = clamp(top, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, window.innerHeight - panelHeight - SCREEN_MARGIN));
        constrainPanel(panel, left, top);
    }

    function createUI() {
        if (document.getElementById(ICON_ID)) return;
        installStyle();
        const icon = document.createElement('button');
        icon.id = ICON_ID;
        icon.type = 'button';
        icon.title = "Snail's Hidden Mod 설정";
        icon.textContent = '🐌';

        const panel = document.createElement('section');
        panel.id = PANEL_ID;
        panel.hidden = true;
        panel.innerHTML = `
            <div class="snail-head">
                <div class="snail-title">🐌 Snail's Hidden Mod</div>
                <div class="snail-head-controls">
                    <button type="button" class="snail-page-nav snail-page-prev" aria-label="이전 페이지">◀</button>
                    <span class="snail-page-indicator">1/3</span>
                    <button type="button" class="snail-page-nav snail-page-next" aria-label="다음 페이지">▶</button>
                    <button type="button" class="snail-close" aria-label="닫기">×</button>
                </div>
            </div>
            <div class="snail-page" data-page="1">
                <label class="snail-toggle"><span><b>자동 구매</b><small>구매 가능한 항목을 일정 간격으로 일괄 구매</small></span><input class="snail-auto-buy" type="checkbox"></label>
                <label class="snail-toggle"><span><b>알 자동 심기</b><small>빈 공간을 설정한 규칙에 맞춰 자동으로 채움</small></span><input class="snail-auto-plant" type="checkbox"></label>
                <label class="snail-toggle"><span><b>펫 자동 밥주기</b><small>활성 펫의 굶주림을 확인해 설정된 먹이를 지급</small></span><input class="snail-auto-feed" type="checkbox"></label>
                <div class="snail-actions">
                    <button class="snail-hatch">🐣 모두 부화</button>
                    <button class="snail-sell">💰 펫 판매</button>
                    <button class="snail-egg-settings">🥚 심기 설정</button>
                    <button class="snail-pet-settings-btn">⚙ 설정</button>
                </div>
                <div class="snail-pet-settings">
                    <div class="snail-pet-group snail-collapsible" data-collapse-key="saleProtection">
                        <div class="snail-master-card">
                            <button type="button" class="snail-group-toggle"><span class="snail-group-chevron">▼</span><span><b>판매 보호</b><small>보호 조건에 해당하는 펫은 판매 대상에서 제외</small></span></button>
                            <input type="checkbox" aria-label="판매 보호" data-pet-setting="useSaleProtection">
                        </div>
                        <div class="snail-subsettings" data-depends-on="useSaleProtection">
                            <label class="snail-setting"><span>Gold 보호</span><input type="checkbox" data-pet-setting="protectGold"></label>
                            <label class="snail-setting"><span>Rainbow 보호</span><input type="checkbox" data-pet-setting="protectRainbow"></label>
                            <label class="snail-setting"><span>STR 보호</span><input type="checkbox" data-pet-setting="protectStr"></label>
                            <label class="snail-setting"><span>최대 STR 기준</span><input type="number" min="0" max="100" data-pet-setting="strThreshold"></label>
                        </div>
                    </div>
                    <div class="snail-pet-group snail-collapsible" data-collapse-key="presetSwitch">
                        <div class="snail-master-card">
                            <button type="button" class="snail-group-toggle"><span class="snail-group-chevron">▼</span><span><b>프리셋 변경</b><small>부화·천장 대기·판매용 프리셋을 자동 적용</small></span></button>
                            <input type="checkbox" aria-label="프리셋 변경" data-pet-setting="usePresetSwitch">
                        </div>
                        <div class="snail-subsettings" data-depends-on="usePresetSwitch">
                            <div class="snail-setting"><span>부화 프리셋</span><span class="snail-preset-row"><input type="text" data-pet-setting="hatchTeamId" placeholder="사용 안 함"><button type="button" data-use-current-preset="hatchTeamId">현재 프리셋</button></span></div>
                            <div class="snail-setting"><span>천장 프리셋</span><span class="snail-preset-row"><input type="text" data-pet-setting="pityTeamId" placeholder="부화 프리셋"><button type="button" data-use-current-preset="pityTeamId">현재 프리셋</button></span></div>
                            <label class="snail-setting"><span>부화 후 복구</span><input type="checkbox" data-pet-setting="restoreAfterHatch"></label>
                            <div class="snail-setting"><span>판매 프리셋</span><span class="snail-preset-row"><input type="text" data-pet-setting="sellTeamId" placeholder="사용 안 함"><button type="button" data-use-current-preset="sellTeamId">현재 프리셋</button></span></div>
                            <label class="snail-setting"><span>판매 후 복구</span><input type="checkbox" data-pet-setting="restoreAfterSell"></label>
                            <div class="snail-setting"><span>현재 프리셋</span><code class="snail-current-preset">감지되지 않음</code></div>
                        </div>
                    </div>
                    <div class="snail-pet-group snail-collapsible" data-collapse-key="miscellaneous">
                        <div class="snail-master-card">
                            <button type="button" class="snail-group-toggle"><span class="snail-group-chevron">▼</span><span><b>기타 사항</b><small>판매 확인과 천장 보호 설정</small></span></button>
                        </div>
                        <div class="snail-subsettings">
                            <label class="snail-setting"><span class="snail-setting-label"><b>판매 목록 팝업</b><small>판매 대상을 먼저 확인하고 선택</small></span><input type="checkbox" data-pet-setting="confirmBeforeSell"></label>
                            <label class="snail-setting"><span class="snail-setting-label"><b>천장 부화 중단</b><small>천장 직전에서 해당 알의 부화를 멈춤</small></span><input type="checkbox" data-pity-setting="stopBeforePity"></label>
                            <label class="snail-setting"><span class="snail-setting-label"><b>천장 이전 생성 계정</b><small class="snail-legacy-state">게임 계정 연결 대기 중</small></span><input class="snail-legacy-account" type="checkbox"></label>
                        </div>
                    </div>
                    <div class="snail-pet-group snail-collapsible" data-collapse-key="intervalSettings">
                        <div class="snail-master-card">
                            <button type="button" class="snail-group-toggle"><span class="snail-group-chevron">▼</span><span><b>간격 설정</b><small>자동화 실행 주기</small></span></button>
                        </div>
                        <div class="snail-subsettings snail-interval-setting">
                            <label class="snail-setting"><span>자동 구매 간격</span><span class="snail-interval-value"><input type="number" min="5" max="3600" step="1" value="${Math.round(settings.intervals.autoBuy / 1000)}" data-interval-setting="autoBuy">초</span></label>
                            <label class="snail-setting"><span>굶주림 확인 간격</span><span class="snail-interval-value"><input type="number" min="2" max="3600" step="1" value="${Math.round(settings.intervals.autoFeed / 1000)}" data-interval-setting="autoFeed">초</span></label>
                        </div>
                    </div>
                    <div class="snail-feed-help">자동 급식 임계값과 먹이는 Arie's Mod → Pets → Alerts / Feeding 설정을 사용합니다.</div>
                </div>
            </div>
            <div class="snail-page" data-page="2" hidden><div class="snail-pity-page-content"></div></div>
            <div class="snail-page" data-page="3" hidden>
                <div class="snail-page-intro"><b>설정 파일</b><small>전체 사용자 설정 백업·복원</small></div>
                <div class="snail-info">자동화, 간격, 프리셋, 판매 보호, 심기 우선순위와 현재 계정의 천장 계산값을 JSON 파일로 저장합니다.</div>
                <div class="snail-backup-actions">
                    <button type="button" class="snail-export-settings">📤 설정 파일 저장</button>
                    <button type="button" class="snail-import-settings">📥 설정 파일 불러오기</button>
                    <input class="snail-import-file" type="file" accept="application/json,.json" hidden>
                </div>
                <div class="snail-backup-meta">아이콘·창 위치와 API 캐시는 제외됩니다. 다른 계정에서 불러오면 천장 계산값은 현재 접속한 계정에 적용됩니다.</div>
            </div>
            <div class="snail-status"></div>`;

        document.body.append(icon, panel);
        panel.querySelector('.snail-auto-buy').checked = settings.autoBuy;
        panel.querySelector('.snail-auto-plant').checked = settings.autoPlant;
        panel.querySelector('.snail-auto-feed').checked = settings.autoFeed;
        syncPetSettingsUI(panel);
        setPanelPage(panel, settings.ui.page, false);
        void preparePityTracking().then(() => {
            syncPetSettingsUI(panel);
            renderPityPage(panel);
        }).catch(error => console.warn('[Snail/Pity]', error));

        const savedPosition = readStored(POSITION_KEY, null);
        const initialPosition = constrainIcon(
            icon,
            Number(savedPosition?.left ?? window.innerWidth - BUTTON_SIZE - DEFAULT_RIGHT_GAP),
            Number(savedPosition?.top ?? 250)
        );
        writeStored(POSITION_KEY, initialPosition);

        let drag = null;
        icon.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            const rect = icon.getBoundingClientRect();
            drag = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                left: rect.left,
                top: rect.top,
                moved: false
            };
            icon.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        icon.addEventListener('pointermove', event => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
            constrainIcon(icon, drag.left + dx, drag.top + dy);
            if (!panel.hidden) positionPanel(icon, panel);
        });
        const finishDrag = event => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            const moved = drag.moved;
            drag = null;
            const rect = icon.getBoundingClientRect();
            writeStored(POSITION_KEY, { left: Math.round(rect.left), top: Math.round(rect.top) });
            if (!moved) {
                panel.hidden = !panel.hidden;
                if (!panel.hidden) positionPanel(icon, panel);
            }
        };
        icon.addEventListener('pointerup', finishDrag);
        icon.addEventListener('pointercancel', finishDrag);

        const title = panel.querySelector('.snail-title');
        let panelDrag = null;
        title.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            const rect = panel.getBoundingClientRect();
            panelDrag = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                left: rect.left,
                top: rect.top
            };
            title.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        title.addEventListener('pointermove', event => {
            if (!panelDrag || panelDrag.pointerId !== event.pointerId) return;
            panelPosition = constrainPanel(
                panel,
                panelDrag.left + event.clientX - panelDrag.startX,
                panelDrag.top + event.clientY - panelDrag.startY
            );
        });
        const finishPanelDrag = event => {
            if (!panelDrag || panelDrag.pointerId !== event.pointerId) return;
            panelDrag = null;
            if (panelPosition) writeStored(PANEL_POSITION_KEY, panelPosition);
        };
        title.addEventListener('pointerup', finishPanelDrag);
        title.addEventListener('pointercancel', finishPanelDrag);

        panel.querySelector('.snail-close').onclick = () => panel.hidden = true;
        panel.querySelector('.snail-page-prev').onclick = () => setPanelPage(panel, settings.ui.page - 1);
        panel.querySelector('.snail-page-next').onclick = () => setPanelPage(panel, settings.ui.page + 1);
        panel.querySelector('.snail-auto-buy').onchange = event => {
            settings.autoBuy = event.target.checked;
            bellWarningShown = false;
            saveSettings();
            if (settings.autoBuy) autoBuy();
        };
        panel.querySelector('.snail-auto-plant').onchange = event => {
            settings.autoPlant = event.target.checked;
            if (!settings.autoPlant && activeTask === 'plant') cancelRequested = true;
            saveSettings();
            if (settings.autoPlant) autoPlantOnce({ silent: false });
        };
        panel.querySelector('.snail-auto-feed').onchange = event => {
            settings.autoFeed = event.target.checked;
            saveSettings();
            if (settings.autoFeed) {
                setStatus('자동 급식 켜짐 · Arie’s Mod 설정 확인 중');
                checkAutoFeed({ announce: true });
            } else {
                stopAutoFeed();
                setStatus('자동 급식 꺼짐');
            }
        };
        panel.querySelector('.snail-egg-settings').onclick = openEggSettings;
        panel.querySelector('.snail-hatch').onclick = hatchAll;
        panel.querySelector('.snail-sell').onclick = openSellPetsDialog;
        panel.querySelector('.snail-pet-settings-btn').onclick = () => {
            panel.classList.toggle('show-pet-settings');
            positionPanel(icon, panel);
        };
        panel.querySelectorAll('.snail-group-toggle').forEach(button => {
            button.onclick = () => {
                toggleSection(panel, button.closest('.snail-collapsible'));
                positionPanel(icon, panel);
            };
        });
        panel.querySelectorAll('[data-interval-setting]').forEach(input => {
            input.onchange = () => {
                const key = input.dataset.intervalSetting;
                const minimum = key === 'autoBuy' ? 5 : 2;
                const seconds = clampInt(input.value, minimum, 3_600);
                input.value = String(seconds);
                settings.intervals[key] = seconds * 1_000;
                saveSettings();
                rescheduleAutomation(key);
                setStatus(`${key === 'autoBuy' ? '자동 구매' : '자동 급식'} 간격 · ${seconds}초`, 'ok');
            };
        });
        panel.querySelectorAll('[data-pet-setting]').forEach(input => {
            const key = input.dataset.petSetting;
            const update = () => {
                settings.pets[key] = input.type === 'checkbox'
                    ? input.checked
                    : input.type === 'number'
                        ? clampInt(input.value, 0, 100)
                        : input.value.trim();
                saveSettings();
                refreshPetGroupStates(panel);
            };
            input.addEventListener('change', update);
        });
        panel.querySelectorAll('[data-pity-setting]').forEach(input => {
            input.onchange = () => {
                settings.pity[input.dataset.pitySetting] = input.checked;
                saveSettings();
                setStatus(input.checked ? '천장 직전 부화 중단 켜짐' : '천장 직전 부화 중단 꺼짐', 'ok');
            };
        });
        panel.querySelector('.snail-legacy-account').onchange = async event => {
            if (!event.target.checked) return;
            if (!confirm('천장 시스템 도입 전에 생성된 계정인가요?\n\n확인을 누르면 모든 천장 계산값에 50% 보정을 한 번만 적용합니다.')) {
                event.target.checked = false;
                return;
            }
            event.target.disabled = true;
            try {
                await applyLegacyPityBonus();
                syncPetSettingsUI(panel);
                setStatus('이전 계정 50% 천장 보정 적용 완료', 'ok');
            } catch (error) {
                event.target.disabled = false;
                event.target.checked = false;
                setStatus(error?.message || String(error), 'error');
            }
        };
        panel.querySelectorAll('[data-use-current-preset]').forEach(button => {
            button.onclick = () => {
                const current = getCurrentPresetId();
                if (!current) {
                    setStatus('현재 프리셋을 먼저 게임에서 선택해 주세요.', 'error');
                    return;
                }
                const key = button.dataset.useCurrentPreset;
                const input = panel.querySelector(`[data-pet-setting="${key}"]`);
                settings.pets[key] = current;
                if (input) input.value = current;
                saveSettings();
                const label = key === 'hatchTeamId' ? '부화' : key === 'pityTeamId' ? '천장' : '판매';
                setStatus(`${label} 프리셋 저장됨`, 'ok');
            };
        });
        const importInput = panel.querySelector('.snail-import-file');
        panel.querySelector('.snail-export-settings').onclick = () => {
            exportSettingsFile().catch(error => setStatus(error?.message || String(error), 'error'));
        };
        panel.querySelector('.snail-import-settings').onclick = () => importInput.click();
        importInput.onchange = async () => {
            const file = importInput.files?.[0];
            importInput.value = '';
            if (!file) return;
            try {
                await importSettingsFile(file, panel);
            } catch (error) {
                setStatus(error?.message || String(error), 'error');
            }
        };

        window.addEventListener('resize', () => {
            const rect = icon.getBoundingClientRect();
            const position = constrainIcon(icon, rect.left, rect.top);
            writeStored(POSITION_KEY, position);
            if (!panel.hidden) positionPanel(icon, panel);
        });
        refreshActionButtons();
    }

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (activeTask) {
            cancelRequested = true;
            setStatus('중지 요청');
            event.preventDefault();
        } else if (modal) {
            closeModal();
            event.preventDefault();
        }
    }, true);

    let automationJobs = [];
    let automationTimer = null;

    function scheduleAutomationTick() {
        if (!automationJobs.length) return;
        clearTimeout(automationTimer);
        const nextAt = Math.min(...automationJobs.map(job => job.nextAt));
        automationTimer = setTimeout(runAutomationTick, Math.max(250, nextAt - Date.now()));
    }

    function runAutomationTick() {
        const current = Date.now();
        for (const job of automationJobs) {
            if (current < job.nextAt) continue;
            job.nextAt = current + job.getInterval();
            void job.run();
        }
        scheduleAutomationTick();
    }

    function rescheduleAutomation(name) {
        const job = automationJobs.find(item => item.name === name);
        if (!job) return;
        job.nextAt = Date.now() + job.getInterval();
        scheduleAutomationTick();
    }

    function startAutomationScheduler() {
        const now = Date.now();
        automationJobs = [
            { name: 'autoBuy', nextAt: now + AUTO_BUY_FIRST_DELAY, getInterval: () => settings.intervals.autoBuy, run: autoBuy },
            { name: 'autoPlant', nextAt: now + AUTO_PLANT_FIRST_DELAY, getInterval: () => AUTO_PLANT_INTERVAL, run: autoPlantOnce },
            { name: 'autoFeed', nextAt: now + AUTO_FEED_FIRST_DELAY, getInterval: () => settings.intervals.autoFeed, run: checkAutoFeed }
        ];
        scheduleAutomationTick();
    }

    function start() {
        createUI();
        startAutomationScheduler();
        startPityTracker();
        console.log(`[Snail's Hidden Mod] v${SCRIPT_VERSION} loaded`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
