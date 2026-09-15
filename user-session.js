(function () {
  function getRegisteredUser() {
    try {
      const currentUser = JSON.parse(localStorage.getItem('evergreenCurrentUser') || 'null');
      const users = JSON.parse(localStorage.getItem('evergreenUsers') || '[]');
      const email = (currentUser?.email || '').trim().toLowerCase();
      if (!email) return currentUser;

      const registeredUser = users.find((user) => (user.email || '').trim().toLowerCase() === email);
      if (!registeredUser) return currentUser;

      const normalizedUser = {
        ...currentUser,
        firstName: registeredUser.firstName || '',
        lastName: registeredUser.lastName || '',
        email: registeredUser.email || email,
        accountType: registeredUser.accountType || currentUser.accountType || 'Everyday checking',
        country: registeredUser.country || currentUser.country || '',
        currency: registeredUser.currency || currentUser.currency || ''
      };

      localStorage.setItem('evergreenCurrentUser', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch (error) {
      return null;
    }
  }

  window.EvergreenUserSession = { getRegisteredUser };
  getRegisteredUser();
}());
