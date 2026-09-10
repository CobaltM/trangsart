/*
	Klaviyo integration for trangs.art
	----------------------------------
	Everything you need to configure lives in the CONFIG block right below.
	Fill in the two values, redeploy, and the newsletter signup in the footer
	of every page starts sending subscribers to Klaviyo.

	Where to find the values:

	  PUBLIC_API_KEY  Klaviyo > Settings > API keys > "Public API key / Site ID".
	                  It is 6 characters (e.g. "aBc123") and is safe to ship in
	                  public JavaScript. NEVER put a private API key here.

	  LIST_ID         Klaviyo > Audience > Lists & Segments > open your list.
	                  The ID is the 6-character code in the browser address bar
	                  and under the list's Settings tab.
*/

(function () {
	'use strict';

	/* ---------------------------------------------------------------- CONFIG */

	var CONFIG = {

		// REQUIRED. Your Klaviyo public API key (site ID).
		PUBLIC_API_KEY: 'YOUR_PUBLIC_API_KEY',

		// REQUIRED for the footer signup form. The list new subscribers join.
		LIST_ID: 'YOUR_LIST_ID',

		// Klaviyo API version. Only change this if Klaviyo's docs tell you to.
		API_REVISION: '2026-07-15',

		// Label shown in Klaviyo so you can tell where a subscriber came from.
		SOURCE: 'trangs.art footer signup',

		// Set to false to stop sending "Viewed Gallery" events.
		TRACK_GALLERY_VIEWS: true

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

	// The onsite script replaces this array with its real API once it loads,
	// so anything pushed before then is replayed afterwards.
	window.klaviyo = window.klaviyo || [];

	loadKlaviyoOnsite();

	/* --------------------------------------------------------------- Helpers */

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

		window.klaviyo.push(['track', 'Viewed Gallery', {
			Category: GALLERY_PAGES[key],
			URL: window.location.href
		}]);
	}

	/* ------------------------------------------------------- Newsletter form */

	function subscribe(email) {
		var payload = {
			data: {
				type: 'subscription',
				attributes: {
					custom_source: CONFIG.SOURCE,
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

	function wireForm(form) {
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

			subscribe(email).then(function () {
				// Tie this browser's future activity to the subscriber.
				window.klaviyo.push(['identify', { '$email': email }]);

				form.classList.remove('is-busy');
				form.classList.add('is-done');
				say('Thank you — check your inbox to confirm.', 'success');
				input.value = '';
				input.disabled = true;
				if (button) button.disabled = true;
			}).catch(function (error) {
				form.classList.remove('is-busy');
				if (button) button.disabled = false;
				say('Something went wrong. Please try again in a moment.', 'error');
				console.error('[Klaviyo] Subscription failed:', error);
			});
		});
	}

	function init() {
		var forms = document.querySelectorAll('.klaviyo-signup');

		for (var i = 0; i < forms.length; i++)
			wireForm(forms[i]);

		trackGalleryView();
	}

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', init);
	else
		init();

})();
