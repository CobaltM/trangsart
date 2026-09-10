/*
	Klaviyo integration for trangs.art
	----------------------------------
	Everything you can configure lives in the CONFIG block right below: the
	popup's wording and timing, the tracking toggle, and the two Klaviyo IDs.

	The IDs are already set and working. If they ever need changing:

	  PUBLIC_API_KEY  Klaviyo > Settings > API keys > "Public API key / Site ID".
	                  It is 6 characters and is safe to ship in public
	                  JavaScript. NEVER put a private API key here.

	  LIST_ID         Klaviyo > Audience > Lists & Segments > open your list.
	                  The ID is the 6-character code in the browser address bar
	                  and under the list's Settings tab.

	This file provides:
	  - Klaviyo onsite tracking on every page
	  - the newsletter signup in the footer
	  - the welcome popup for first-time visitors
	  - a "Viewed Gallery" event on each gallery page
*/

(function () {
	'use strict';

	/* ---------------------------------------------------------------- CONFIG */

	var CONFIG = {

		// REQUIRED. Your Klaviyo public API key (site ID).
		PUBLIC_API_KEY: 'Vbe6AQ',

		// REQUIRED for the footer signup form. The list new subscribers join.
		LIST_ID: 'RmrNAX',

		// Klaviyo API version. Only change this if Klaviyo's docs tell you to.
		API_REVISION: '2026-07-15',

		// Labels shown in Klaviyo so you can tell where a subscriber came from.
		SOURCE_FOOTER: 'trangs.art footer signup',
		SOURCE_POPUP: 'trangs.art welcome popup',

		// Set to false to stop sending "Viewed Gallery" events.
		TRACK_GALLERY_VIEWS: true,

		// The welcome popup shown to first-time visitors.
		POPUP: {

			// Set to false to turn the popup off entirely. Do this if you decide
			// to build a popup inside Klaviyo instead, so you don't get two.
			ENABLED: true,

			// How long to wait before showing it.
			DELAY_SECONDS: 8,

			// Every page opens on the full-screen "Trangs.art" splash. Leaving
			// this true holds the popup until the visitor scrolls down and has
			// actually seen some art, which converts far better than asking
			// before they have seen anything. Set it to false to show the
			// popup after DELAY_SECONDS no matter what.
			WAIT_FOR_SCROLL: true,

			// After someone dismisses it, wait this many days before asking
			// again. Once they sign up, they are never asked again.
			DAYS_BEFORE_ASKING_AGAIN: 30,

			// Wording. Change freely.
			HEADING: 'Stay in touch',
			BODY: 'New paintings, prints, and show dates &mdash; a few times a year, straight to your inbox.',
			BUTTON: 'Sign up',
			DISMISS: 'No thanks',
			SUCCESS: 'Thank you &mdash; check your inbox to confirm.',

			// Optional image across the top of the popup, e.g.
			// 'images/flowerdance2.png'. Leave as '' for no image.
			IMAGE: ''

		}

	};

	/* ------------------------------------------------------------ END CONFIG */

	var CONFIGURED = CONFIG.PUBLIC_API_KEY.indexOf('YOUR_') !== 0;
	var LIST_CONFIGURED = CONFIG.LIST_ID.indexOf('YOUR_') !== 0;

	// Human-readable names for the gallery pages, keyed by URL path.
	var GALLERY_PAGES = {
		'paintings': 'Vietnam & Traditions',
		'book&film': 'Book & Film',
		'impressionistic': 'Impressionistic',
		'prints': 'Printmaking',
		'ceramics': 'Ceramics',
		'events': 'Events',
		'about': 'About',
		'commission': 'Commission'
	};

	/* --------------------------------------------------- Onsite tracking tag */

	// Klaviyo's onsite script. This powers Active on Site tracking and lets any
	// popup / flyout / embedded form you build in Klaviyo appear on the site
	// with no further code changes here.
	function loadKlaviyoOnsite() {
		if (!CONFIGURED) {
			console.warn('[Klaviyo] PUBLIC_API_KEY is not set in assets/js/klaviyo.js — tracking and signups are disabled.');
			return;
		}

		if (document.querySelector('script[src*="static.klaviyo.com/onsite"]'))
			return;

		var s = document.createElement('script');
		s.async = true;
		s.type = 'text/javascript';
		s.src = 'https://static.klaviyo.com/onsite/js/' + encodeURIComponent(CONFIG.PUBLIC_API_KEY) + '/klaviyo.js';
		(document.head || document.documentElement).appendChild(s);
	}

	/*
		Send an event to Klaviyo.

		Timing matters here. klaviyo.js loads asynchronously and pulls in its
		tracking modules afterwards, so calls can happen before it is ready.
		Klaviyo's loader creates window._learnq for exactly that: it is the
		queue it drains once the modules are up. window.klaviyo is the object
		those modules install later.

		So: use window.klaviyo when it is a real object, otherwise queue on
		_learnq. Never assign window.klaviyo ourselves — pre-defining it as an
		array shadows the object Klaviyo is about to install, and everything
		pushed into that array is silently thrown away.
	*/
	function klaviyoPush(args) {
		if (window.klaviyo && !Array.isArray(window.klaviyo) && typeof window.klaviyo.push === 'function') {
			window.klaviyo.push(args);
			return;
		}

		window._learnq = window._learnq || [];
		window._learnq.push(args);
	}

	loadKlaviyoOnsite();

	/* --------------------------------------------------------------- Helpers */

	var STORAGE = {
		subscribed: 'trangsart.newsletter.subscribed',
		dismissed: 'trangsart.newsletter.dismissed'
	};

	// localStorage throws in private windows and when cookies are blocked,
	// so every read and write is guarded. Worst case the popup shows again.
	function remember(key, value) {
		try {
			window.localStorage.setItem(key, value);
		} catch (e) {}
	}

	function recall(key) {
		try {
			return window.localStorage.getItem(key);
		} catch (e) {
			return null;
		}
	}

	function isEmail(value) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
	}

	function currentPageKey() {
		var path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

		if (path === '' || path === 'index.html')
			return null;

		return decodeURIComponent(path.split('/').pop()).replace(/\.html$/, '');
	}

	function trackGalleryView() {
		if (!CONFIG.TRACK_GALLERY_VIEWS || !CONFIGURED)
			return;

		var key = currentPageKey();

		if (!key || !GALLERY_PAGES[key])
			return;

		klaviyoPush(['track', 'Viewed Gallery', {
			Category: GALLERY_PAGES[key],
			URL: window.location.href
		}]);
	}

	/* ------------------------------------------------------- Newsletter form */

	function subscribe(email, source) {
		var payload = {
			data: {
				type: 'subscription',
				attributes: {
					custom_source: source || CONFIG.SOURCE_FOOTER,
					profile: {
						data: {
							type: 'profile',
							attributes: {
								email: email,
								subscriptions: {
									email: {
										marketing: {
											consent: 'SUBSCRIBED'
										}
									}
								}
							}
						}
					}
				},
				relationships: {
					list: {
						data: {
							type: 'list',
							id: CONFIG.LIST_ID
						}
					}
				}
			}
		};

		return fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + encodeURIComponent(CONFIG.PUBLIC_API_KEY), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'revision': CONFIG.API_REVISION
			},
			body: JSON.stringify(payload)
		}).then(function (response) {
			// A successful client subscription returns 202 Accepted with no body.
			if (response.status === 202 || response.ok)
				return true;

			return response.text().then(function (body) {
				throw new Error('Klaviyo responded ' + response.status + ': ' + body);
			});
		});
	}

	function wireForm(form, options) {
		options = options || {};

		var input = form.querySelector('input[type="email"]'),
			button = form.querySelector('button, input[type="submit"]'),
			status = form.querySelector('.klaviyo-signup-status');

		function say(message, kind) {
			if (!status)
				return;

			status.textContent = message;
			status.className = 'klaviyo-signup-status is-visible is-' + kind;
		}

		form.addEventListener('submit', function (event) {
			event.preventDefault();

			var email = (input.value || '').trim();

			if (!isEmail(email)) {
				say('Please enter a valid email address.', 'error');
				input.focus();
				return;
			}

			if (!CONFIGURED || !LIST_CONFIGURED) {
				say('Newsletter signup is not finished being set up yet.', 'error');
				console.warn('[Klaviyo] Set PUBLIC_API_KEY and LIST_ID in assets/js/klaviyo.js.');
				return;
			}

			form.classList.add('is-busy');
			if (button) button.disabled = true;
			say('Signing you up…', 'pending');

			subscribe(email, options.source).then(function () {
				// Tie this browser's future activity to the subscriber.
				klaviyoPush(['identify', { '$email': email }]);

				// Remember, so the popup never bothers this person again.
				remember(STORAGE.subscribed, '1');

				form.classList.remove('is-busy');
				form.classList.add('is-done');
				say(options.successMessage || 'Thank you — check your inbox to confirm.', 'success');
				input.value = '';
				input.disabled = true;
				if (button) button.disabled = true;

				if (options.onSuccess)
					options.onSuccess();
			}).catch(function (error) {
				form.classList.remove('is-busy');
				if (button) button.disabled = false;
				say('Something went wrong. Please try again in a moment.', 'error');
				console.error('[Klaviyo] Subscription failed:', error);
			});
		});
	}

	/* ---------------------------------------------------- Welcome popup */

	function shouldShowPopup() {
		var popup = CONFIG.POPUP;

		if (!popup.ENABLED || !CONFIGURED || !LIST_CONFIGURED)
			return false;

		// Never pester someone who already signed up.
		if (recall(STORAGE.subscribed))
			return false;

		// Respect a recent dismissal.
		var dismissedAt = parseInt(recall(STORAGE.dismissed), 10);

		if (dismissedAt) {
			var daysSince = (Date.now() - dismissedAt) / 86400000;

			if (daysSince < popup.DAYS_BEFORE_ASKING_AGAIN)
				return false;
		}

		return true;
	}

	function buildPopup() {
		var popup = CONFIG.POPUP,
			overlay = document.createElement('div');

		overlay.className = 'klaviyo-popup-overlay';
		overlay.setAttribute('hidden', 'hidden');

		overlay.innerHTML =
			'<div class="klaviyo-popup' + (popup.IMAGE ? ' has-image' : '') + '" role="dialog" aria-modal="true" aria-labelledby="klaviyo-popup-heading">' +
				'<button type="button" class="klaviyo-popup-close" aria-label="Close">&times;</button>' +
				(popup.IMAGE
					? '<div class="klaviyo-popup-image"><img src="' + popup.IMAGE + '" alt="" /></div>'
					: '') +
				'<div class="klaviyo-popup-body">' +
					'<h2 id="klaviyo-popup-heading">' + popup.HEADING + '</h2>' +
					'<p class="klaviyo-popup-text">' + popup.BODY + '</p>' +
					'<form class="klaviyo-signup klaviyo-popup-form" novalidate>' +
						'<label class="sr-only" for="klaviyo-popup-email">Email address</label>' +
						'<input type="email" id="klaviyo-popup-email" name="email" placeholder="your@email.com" autocomplete="email" required />' +
						'<button type="submit" class="button primary">' + popup.BUTTON + '</button>' +
						'<p class="klaviyo-signup-status" role="status" aria-live="polite"></p>' +
					'</form>' +
					'<button type="button" class="klaviyo-popup-dismiss">' + popup.DISMISS + '</button>' +
				'</div>' +
			'</div>';

		document.body.appendChild(overlay);

		return overlay;
	}

	function setUpPopup() {
		if (!shouldShowPopup())
			return;

		var overlay = buildPopup(),
			dialog = overlay.querySelector('.klaviyo-popup'),
			input = overlay.querySelector('input[type="email"]'),
			form = overlay.querySelector('.klaviyo-signup'),
			lastFocused = null,
			isOpen = false;

		function focusable() {
			return dialog.querySelectorAll('button:not([disabled]), input:not([disabled])');
		}

		function onKeydown(event) {
			if (event.key === 'Escape' || event.keyCode === 27) {
				close(true);
				return;
			}

			if (event.key !== 'Tab' && event.keyCode !== 9)
				return;

			// Keep keyboard focus inside the dialog while it is open.
			var items = focusable();

			if (!items.length)
				return;

			var first = items[0],
				last = items[items.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			}
			else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		function open() {
			if (isOpen)
				return;

			isOpen = true;
			lastFocused = document.activeElement;
			overlay.removeAttribute('hidden');

			// Next frame, so the CSS transition has a state to move from.
			window.requestAnimationFrame(function () {
				overlay.classList.add('is-visible');
			});

			document.addEventListener('keydown', onKeydown);

			if (input)
				input.focus();
		}

		function close(remember_dismissal) {
			if (!isOpen)
				return;

			isOpen = false;
			overlay.classList.remove('is-visible');
			document.removeEventListener('keydown', onKeydown);

			if (remember_dismissal)
				remember(STORAGE.dismissed, String(Date.now()));

			window.setTimeout(function () {
				overlay.setAttribute('hidden', 'hidden');
			}, 300);

			if (lastFocused && lastFocused.focus)
				lastFocused.focus();
		}

		wireForm(form, {
			source: CONFIG.SOURCE_POPUP,
			successMessage: CONFIG.POPUP.SUCCESS.replace(/&mdash;/g, '—'),
			onSuccess: function () {
				// Let them read the thank-you, then get out of the way.
				window.setTimeout(function () { close(false); }, 2500);
			}
		});

		overlay.querySelector('.klaviyo-popup-close').addEventListener('click', function () { close(true); });
		overlay.querySelector('.klaviyo-popup-dismiss').addEventListener('click', function () { close(true); });

		// Clicking the backdrop, but not the dialog itself, closes it.
		overlay.addEventListener('click', function (event) {
			if (event.target === overlay)
				close(true);
		});

		schedule();

		// Open once the delay has passed and — if WAIT_FOR_SCROLL is on — the
		// visitor has scrolled past the splash. Both conditions, not either.
		function schedule() {
			var popup = CONFIG.POPUP,
				SCROLLED_ENOUGH = 100,
				delayDone = false,
				scrolled = !popup.WAIT_FOR_SCROLL || window.pageYOffset > SCROLLED_ENOUGH;

			function maybeOpen() {
				if (delayDone && scrolled)
					open();
			}

			window.setTimeout(function () {
				delayDone = true;
				maybeOpen();
			}, popup.DELAY_SECONDS * 1000);

			if (scrolled)
				return;

			function onScroll() {
				if (window.pageYOffset <= SCROLLED_ENOUGH)
					return;

				scrolled = true;
				window.removeEventListener('scroll', onScroll);
				maybeOpen();
			}

			window.addEventListener('scroll', onScroll);
		}
	}

	/* ------------------------------------------------------------------ Init */

	function init() {
		var forms = document.querySelectorAll('.klaviyo-signup');

		for (var i = 0; i < forms.length; i++)
			wireForm(forms[i], { source: CONFIG.SOURCE_FOOTER });

		trackGalleryView();
		setUpPopup();
	}

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', init);
	else
		init();

})();
