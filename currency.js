(function () {
  const fallbackCurrency = 'USD';

  function getCurrencyCode() {
    try {
      const currentUser = JSON.parse(localStorage.getItem('evergreenCurrentUser') || 'null');
      const accountStore = JSON.parse(localStorage.getItem('evergreenAccounts') || '{}');
      const users = JSON.parse(localStorage.getItem('evergreenUsers') || '[]');
      const email = (currentUser?.email || '').trim().toLowerCase();
      const account = email ? accountStore[email] : null;
      const storedUser = users.find((user) => (user.email || '').trim().toLowerCase() === email);
      return account?.currency || currentUser?.currency || storedUser?.currency || fallbackCurrency;
    } catch (error) {
      return fallbackCurrency;
    }
  }

  function formatCurrency(value) {
    const currencyCode = getCurrencyCode();
    const locale = currencyCode === 'ZAR' ? 'en-ZA' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(Number(value || 0));
  }

  function replaceStaticCurrencyText() {
    const currencyCode = getCurrencyCode();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;

    while ((node = walker.nextNode())) {
      if (node.parentElement && !['SCRIPT', 'STYLE'].includes(node.parentElement.tagName) && node.nodeValue.includes('$')) {
        textNodes.push(node);
      }
    }

    const currencyPrefix = currencyCode === 'ZAR' ? 'R ' : `${currencyCode} `;
    textNodes.forEach((textNode) => {
      textNode.nodeValue = textNode.nodeValue.replace(/(?<![A-Z])\$/g, currencyPrefix);
    });
  }

  window.EvergreenCurrency = {
    getCode: getCurrencyCode,
    format: formatCurrency
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceStaticCurrencyText);
  } else {
    replaceStaticCurrencyText();
  }
}());
