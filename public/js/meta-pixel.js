(function loadMetaPixel(windowObject, documentObject) {
    if (windowObject.fbq) return;

    const fbq = function (...args) {
        if (fbq.callMethod) {
            fbq.callMethod(...args);
        } else {
            fbq.queue.push(args);
        }
    };

    windowObject.fbq = fbq;
    if (!windowObject._fbq) windowObject._fbq = fbq;

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    const script = documentObject.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    documentObject.head.appendChild(script);

    fbq('init', '1076844350413426');
    fbq('track', 'PageView');
})(window, document);
