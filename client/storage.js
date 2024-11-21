const storage = {
  getToken: () => {
    try {
      const token = window.Telegram.WebApp.initData;
      return token ? token : null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  },
};

export default storage;
