/* Harness QA: menjalankan script index.html di sandbox DOM palsu untuk mencari error runtime & markup tak seimbang */
const fs = require('fs'), vm = require('vm');
const file = process.argv[2] || 'index.html';
const html = fs.readFileSync(file, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
const els = {}, outputs = [], listeners = {}, problems = [];

function makeEl(id) {
	const classes = new Set();
	const store = { id, innerHTML: '', textContent: '', value: '', checked: false, className: '', disabled: false };
	const base = {
		classList: { add: (...c) => c.forEach(x => classes.add(x)), remove: (...c) => c.forEach(x => classes.delete(x)), toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : f; on ? classes.add(c) : classes.delete(c); return on; }, contains: c => classes.has(c) },
		style: new Proxy({}, { get: (t, k) => k === 'setProperty' ? () => {} : t[k], set: (t, k, v) => { t[k] = v; return true; } }),
		dataset: {}, files: [], children: [], offsetHeight: 0, scrollHeight: 0,
		addEventListener() {}, removeEventListener() {}, querySelector: () => makeEl('q'), querySelectorAll: () => [], closest: () => null,
		getAttribute: () => '', setAttribute() {}, removeAttribute() {}, appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {}, click() {},
		scrollTo() {}, scrollIntoView() {}, insertAdjacentHTML() {}, contains: () => false, select() {}, setSelectionRange() {},
		getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 })
	};
	return new Proxy(store, {
		get: (t, k) => k in t ? t[k] : base[k],
		set: (t, k, v) => { if (k === 'innerHTML') outputs.push({ id, html: String(v) }); t[k] = v; return true; }
	});
}
const getEl = id => els[id] || (els[id] = makeEl(id));
const mem = new Map();
const doc = {
	getElementById: getEl, querySelector: s => getEl('Q:' + s), querySelectorAll: () => [],
	createElement: () => makeEl('created'), addEventListener: (t, fn) => (listeners[t] = listeners[t] || []).push(fn),
	documentElement: makeEl('html'), body: makeEl('body'), head: makeEl('head'), readyState: 'complete', hidden: false
};
const sandbox = {
	document: doc, console, Math, Date, JSON, Promise, URL: Object.assign(function (...a) { return new URL(...a); }, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }), Blob: class {}, FileReader: class {}, Intl, Number, String, Array, Object, Set, Map, Error, RegExp, parseFloat, parseInt, isNaN, encodeURIComponent, decodeURIComponent, structuredClone,
	localStorage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
	navigator: { onLine: true, vibrate() {}, clipboard: { writeText: () => Promise.resolve() }, geolocation: undefined },
	location: { protocol: 'https:', href: 'https://x.test/' }, matchMedia: () => ({ matches: false, addEventListener() {} }),
	fetch: () => Promise.reject(new Error('offline')), setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
	requestAnimationFrame: () => 0, cancelAnimationFrame() {}, addEventListener: (t, fn) => (listeners['w:' + t] = listeners['w:' + t] || []).push(fn),
	open: () => null, getComputedStyle: () => ({}), innerWidth: 1280, scrollTo() {}
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const names = ['STORE_CONFIG', 'TANGERANG_LOCATIONS', 'StoreAvailability', 'ProductRepository', 'AppState', 'ShippingCalculator', 'SettingsManager', 'UIRenderer', 'CheckoutController', 'ModalManager', 'StockManager', 'OrderTracker', 'OrderRecap', 'GeoLocator', 'Recommendations', 'SmartSearch', 'PwaManager', 'OnboardingController', 'Toast', 'getProducts'];
const exporter = `\n;globalThis.__m = { ${names.filter(n => n !== 'getProducts').join(', ')}, products: () => PRODUCTS_DATA };`;
const step = (label, fn) => { try { const r = fn(); if (r !== undefined) console.log(label, '=>', r); } catch (e) { problems.push(`${label}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); } };

const path = require('path');
const kontrolFile = path.join(path.dirname(path.resolve(file)), 'kontrol.js');
if (fs.existsSync(kontrolFile)) {
	vm.runInContext(fs.readFileSync(kontrolFile, 'utf8'), sandbox, { filename: 'kontrol.js' });
	if (process.env.KONTROL_JSON) vm.runInContext('Object.assign(KONTROL_TOKO, ' + process.env.KONTROL_JSON + ')', sandbox);
} else console.log('(kontrol.js tidak ditemukan: menguji mode cadangan)');

try { vm.runInContext(script + exporter, sandbox, { filename: 'index.js' }); } catch (e) { problems.push('LOAD: ' + e.stack.split('\n').slice(0, 4).join(' | ')); }
const m = sandbox.__m;
if (m) {
	(listeners['DOMContentLoaded'] || []).forEach((fn, i) => step('DOMContentLoaded#' + i, () => fn()));
	const { AppState, UIRenderer, CheckoutController, OrderTracker, GeoLocator, StockManager, Recommendations, SmartSearch, ShippingCalculator, StoreAvailability, SettingsManager } = m;
	step('kontrol', () => {
		const c = m.STORE_CONFIG;
		StoreAvailability.renderAllIndicators();
		return JSON.stringify({ fee: c.serviceFee, radius: c.maxRadiusKm, kota: c.shippingRules['Tangerang Kota'], rek: c.officialDestinations.map(d => d.id + ':' + d.accountNumber), status: StoreAvailability.getStatus(), footerToko: els['footer-store-hours'] && els['footer-store-hours'].innerHTML, footerOnline: els['footer-online-hours'] && els['footer-online-hours'].innerHTML, infoFee: els['info-service-fee'] && els['info-service-fee'].innerHTML, infoRadius: els['info-radius-km'] && els['info-radius-km'].innerHTML, notice: (els['checkout-availability-notice'] && els['checkout-availability-notice'].innerHTML.replace(/\s+/g, ' ').slice(0, 400)) });
	});
	step('stockApply', () => StockManager.apply());
	step('renderProducts', () => UIRenderer.renderProducts());
	step('OOS render', () => { const p = m.products()[0]; p.stock = 0; UIRenderer.renderProducts(); UIRenderer.openProductDetailModal(p.id); p.stock = 2; UIRenderer.renderProducts(); UIRenderer.openProductDetailModal(p.id); p.stock = 5; });
	step('detail all', () => m.products().forEach(p => UIRenderer.openProductDetailModal(p.id)));
	step('cart', () => { AppState.addToCart('prd-01', 1); AppState.addToCart('prd-02', 2); UIRenderer.renderCartModal(); UIRenderer.updateBadges(); });
	const now = Date.now();
	const mk = (id, created, start, eta = 60) => ({ orderId: id, date: 'x', customerName: 'A', phone: '1', region: 'Tangerang Kota', district: 'Cibodas', address: 'Jl', distanceKm: 5, createdAt: created, startAt: start, etaMinutes: eta, mapsUrl: '', bank: 'BCA', destinationAccount: 'GoPay', senderName: 'A', subtotal: 1000, serviceFee: 15000, shippingCost: 10000, grandTotal: 26000, items: [{ productId: 'prd-01', name: 'N', price: 1000, qty: 1, image: 'x' }] });
	AppState.data.orderHistory = [mk('BE-000001', now - 7200000, now - 7200000), mk('BE-000002', now - 600000, now - 600000), mk('BE-000003', now, now + 7200000)];
	step('profile modal', () => { UIRenderer.renderProfileModal(); const c = makeEl('tab'); ['renderProfileBiodataTab', 'renderProfileLikesTab', 'renderProfileOrdersTab', 'renderProfileSearchesTab', 'renderProfileCartTab'].forEach(f => UIRenderer[f](c)); });
	step('tracker', () => { OrderTracker.currentOrderId = 'BE-000003'; OrderTracker.render(true); OrderTracker.currentOrderId = 'BE-000001'; OrderTracker.render(true); OrderTracker.lookup('BE-000002'); OrderTracker.lookup('999'); m.OrderRecap.exportCsv(); });
	step('checkout open', () => CheckoutController.openAndPopulate());
	step('geo parse+apply', () => { GeoLocator.apply(-6.2028, 106.6052, 'GPS'); return JSON.stringify({ r: CheckoutController.selectedRegion, d: CheckoutController.selectedDistrict, loc: !!CheckoutController.customLocation }); });
	step('geo manual clear', () => { CheckoutController.districtDropdown && CheckoutController.districtDropdown.onChange && CheckoutController.districtDropdown.onChange('Cibodas'); return 'loc after manual: ' + !!CheckoutController.customLocation; });

	step('avatar inisial', () => {
		const out = [];
		AppState.data.profile = { ...AppState.data.profile, fullName: 'Heru Santoso', avatar: 'https://placehold.co/160x160/4A7C59/FFFFFF?text=H' };
		UIRenderer.updateBadges(); out.push(AppState.data.profile.avatar.split('text=')[1]);
		AppState.data.profile.fullName = 'Petro'; UIRenderer.updateBadges(); out.push(AppState.data.profile.avatar.split('text=')[1]);
		AppState.data.profile.avatar = 'data:image/png;base64,AAA'; AppState.data.profile.fullName = 'Zed'; UIRenderer.updateBadges(); out.push(AppState.data.profile.avatar.slice(0, 10));
		return out.join(' | ');
	});
	step('geo sync dropdown', () => {
		CheckoutController.openAndPopulate();
		const kab = m.TANGERANG_LOCATIONS['Tangerang Kabupaten'][3];
		GeoLocator.apply(kab.lat + 0.002, kab.lng + 0.002, 'GPS');
		const synced = CheckoutController.selectedRegion + ' / ' + CheckoutController.selectedDistrict + ' / dd=' + CheckoutController.districtDropdown.value + ' (harap ' + kab.name + ')';
		CheckoutController.districtDropdown.onChange(CheckoutController.selectedDistrict);
		return synced + ' | setelah dropdown manual, lokasi akurat: ' + (CheckoutController.customLocation ? 'MASIH ADA' : 'kosong');
	});
	step('geo luar wilayah', () => { CheckoutController.openAndPopulate(); GeoLocator.apply(-6.9, 107.6, 'GPS'); return 'region tetap: ' + CheckoutController.selectedRegion + ', eligible=' + CheckoutController.getShippingEvaluation().eligible; });
	step('summary', () => CheckoutController.renderSummary());
	step('submit', () => { GeoLocator.reset(); CheckoutController.openAndPopulate(); getEl('checkout-name').value = 'Tes'; getEl('checkout-phone').value = '0812'; getEl('checkout-address').value = 'Jl. Tes'; getEl('checkout-sender-name').value = 'Tes'; CheckoutController.selectedDestination = 'GoPay'; CheckoutController.handleOrderSubmit(); const o = AppState.data.orderHistory[0]; return 'pending=' + (o.startAt > o.createdAt) + ' orders: ' + AppState.data.orderHistory.length + ' cart: ' + AppState.data.cart.length + ' sold: ' + JSON.stringify(AppState.data.stockSold); });
	step('search', () => { SmartSearch.renderSuggestions('yamh'); AppState.filters.search = 'yamha'; return 'hasil: ' + AppState.getFilteredProducts().length; });
	step('reco', () => Recommendations.html(m.products()[0]).length);
	step('avail', () => StoreAvailability.getStatus());
	step('settings', () => { SettingsManager.applyAll(); SettingsManager.syncModalControls(); });
	// Keseimbangan tag pada semua markup yang dihasilkan
	const void_ = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'stop', 'source']);
	outputs.forEach(({ id, html: h }) => {
		const stack = [];
		for (const t of h.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g)) {
			const [, close, tag, , self] = t, name = tag.toLowerCase();
			if (void_.has(name) || self) continue;
			if (!close) stack.push(name);
			else { const top = stack.pop(); if (top !== name) { problems.push(`MARKUP #${id}: </${name}> tidak cocok dengan <${top}>`); return; } }
		}
		if (stack.length) problems.push(`MARKUP #${id}: tag belum ditutup: ${stack.slice(-3).join(',')}`);
	});
}
console.log(problems.length ? 'MASALAH:\n- ' + [...new Set(problems)].join('\n- ') : 'QA runtime: tidak ada error');
