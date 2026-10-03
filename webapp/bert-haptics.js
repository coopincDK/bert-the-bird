/* Cross-platform tactile feedback for Bert The Bird.
 * Android/compatible browsers use the standard Vibration API.
 * iOS WebKit gets trusted button haptics through its native input[switch]
 * behavior, plus a best-effort imperative switch for gameplay events.
 */
(() => {
    'use strict';

    const EFFECTS = Object.freeze({
        button: 8,
        selection: 10,
        star: 12,
        bonusStar: [16, 22, 16],
        reward: [18, 16, 30],
        powerup: [24, 18, 42],
        warning: [30, 24, 30],
        shield: [42, 22, 48],
        rescue: [52, 24, 72],
        death: [72, 36, 115],
        record: [28, 22, 46, 28, 88],
        upgrade: [24, 18, 38, 18, 58],
    });

    const IOS_RE = /iPad|iPhone|iPod/i;
    const OVERLAY_ATTRIBUTE = 'data-bert-haptic-overlay';
    const SWITCH_ATTRIBUTE = 'switch';
    let enabled = true;
    let observer = null;
    let iosDriver = null;
    let pendingTicks = [];
    let lastTrustedTickAt = -Infinity;
    let triggerCount = 0;
    let lastEffect = null;
    let lastTransport = 'none';

    function now() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    function isIOS() {
        if (typeof navigator === 'undefined') return false;
        return IOS_RE.test(navigator.userAgent || '')
            || (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
    }

    function resolvePattern(effect) {
        if (typeof effect === 'number') return Math.max(0, Math.round(effect));
        if (Array.isArray(effect)) return effect.map((value) => Math.max(0, Math.round(Number(value) || 0)));
        return EFFECTS[effect] ?? EFFECTS.selection;
    }

    function clearPendingTicks() {
        pendingTicks.forEach((timer) => clearTimeout(timer));
        pendingTicks = [];
    }

    function ensureIOSDriver() {
        if (!isIOS() || typeof document === 'undefined') return null;
        if (iosDriver?.label?.isConnected) return iosDriver;

        const host = document.createElement('span');
        host.setAttribute('aria-hidden', 'true');
        host.setAttribute('data-bert-haptic-driver', '');
        Object.assign(host.style, {
            position: 'fixed',
            left: '-100px',
            top: '-100px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: '0',
            pointerEvents: 'none',
        });

        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute(SWITCH_ATTRIBUTE, '');
        Object.assign(input.style, { position: 'absolute', width: '1px', height: '1px', visibility: 'hidden' });
        input.addEventListener('click', (event) => event.stopPropagation());
        label.appendChild(input);
        host.appendChild(label);
        (document.body || document.documentElement).appendChild(host);
        iosDriver = { host, label, input };
        return iosDriver;
    }

    function iosTick() {
        const driver = ensureIOSDriver();
        if (!driver) return false;
        try {
            driver.label.click();
            return true;
        } catch (_) {
            return false;
        }
    }

    function iosPattern(pattern) {
        if (!isIOS()) return false;
        if (now() - lastTrustedTickAt < 90) return true;
        clearPendingTicks();
        const values = Array.isArray(pattern) ? pattern : [pattern];
        let elapsed = 0;
        let scheduled = false;
        values.slice(0, 7).forEach((duration, index) => {
            if (index % 2 === 0 && duration > 0) {
                if (elapsed === 0) iosTick();
                else pendingTicks.push(setTimeout(iosTick, elapsed));
                scheduled = true;
            }
            elapsed += Math.max(0, duration);
        });
        return scheduled;
    }

    function trigger(effect = 'selection') {
        if (!enabled) return false;
        const pattern = resolvePattern(effect);
        triggerCount += 1;
        lastEffect = typeof effect === 'string' ? effect : 'custom';
        let delivered = false;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                delivered = navigator.vibrate(pattern) !== false;
                if (delivered) lastTransport = 'vibration';
            } catch (_) { delivered = false; }
        }
        if (!delivered) {
            delivered = iosPattern(pattern);
            if (delivered) lastTransport = 'ios-switch';
        }
        if (!delivered) lastTransport = 'none';
        return delivered;
    }

    function removeOverlay(button) {
        button.querySelector(`:scope > [${OVERLAY_ATTRIBUTE}]`)?.remove();
    }

    function attachTrustedIOSButton(button) {
        if (!isIOS() || !enabled || button.disabled || button.dataset.haptic === 'none') {
            removeOverlay(button);
            return;
        }
        if (button.querySelector(`:scope > [${OVERLAY_ATTRIBUTE}]`)) return;

        const label = document.createElement('label');
        label.setAttribute(OVERLAY_ATTRIBUTE, '');
        label.setAttribute('aria-hidden', 'true');
        Object.assign(label.style, {
            position: 'absolute',
            inset: '0',
            zIndex: '4',
            borderRadius: 'inherit',
            touchAction: 'manipulation',
        });
        label.style.setProperty('-webkit-tap-highlight-color', 'transparent');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute(SWITCH_ATTRIBUTE, '');
        Object.assign(input.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            margin: '0',
            visibility: 'hidden',
        });
        label.addEventListener('pointerdown', () => { lastTrustedTickAt = now(); }, { passive: true });
        input.addEventListener('click', (event) => event.stopPropagation());
        label.appendChild(input);
        if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
        button.appendChild(label);
    }

    function syncControls(root = document) {
        if (typeof document === 'undefined' || !root?.querySelectorAll) return;
        root.querySelectorAll('button').forEach(attachTrustedIOSButton);
        root.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            if (enabled && isIOS()) input.setAttribute(SWITCH_ATTRIBUTE, '');
            else input.removeAttribute(SWITCH_ATTRIBUTE);
        });
    }

    function setEnabled(value) {
        enabled = Boolean(value);
        clearPendingTicks();
        if (typeof document !== 'undefined') {
            if (!enabled) document.querySelectorAll(`[${OVERLAY_ATTRIBUTE}]`).forEach((node) => node.remove());
            syncControls(document);
        }
        return enabled;
    }

    function start() {
        if (typeof document === 'undefined') return;
        syncControls(document);
        document.addEventListener('pointerdown', (event) => {
            if (!enabled || isIOS()) return;
            const button = event.target.closest?.('button');
            if (!button || button.disabled || button.dataset.haptic === 'none') return;
            trigger(button.dataset.haptic || 'button');
        }, true);
        if (typeof MutationObserver === 'undefined' || !document.body) return;
        observer = new MutationObserver((records) => {
            records.forEach((record) => {
                if (record.type === 'attributes' && record.target.matches?.('button')) {
                    attachTrustedIOSButton(record.target);
                    return;
                }
                record.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.matches?.('button')) attachTrustedIOSButton(node);
                    syncControls(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'data-haptic'] });
    }

    window.BertHaptics = Object.freeze({
        effects: EFFECTS,
        trigger,
        setEnabled,
        isEnabled: () => enabled,
        isIOS,
        syncControls,
        support: () => ({ vibration: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function', iosSwitch: isIOS() }),
        snapshot: () => ({ enabled, triggerCount, lastEffect, lastTransport }),
    });

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }
})();
