// User Profile Manager
export class ProfileManager {
  constructor() {
    this.cache = new Map();
  }

  async get(username) {
    if (this.cache.has(username)) {
      return this.cache.get(username);
    }

    try {
      const token = sessionStorage.getItem('wyvernToken');
      const response = await fetch(`/api/profile/${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load profile');

      const profile = await response.json();
      this.cache.set(username, profile);
      return profile;
    } catch (error) {
      console.error(`Profile fetch error for ${username}:`, error);
      return null;
    }
  }

  getAvatarHTML(username, profile) {
    if (profile?.avatar) {
      return `<img src="${profile.avatar}" alt="${username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />`;
    }
    return username.charAt(0).toUpperCase();
  }

  getColor(profile) {
    return profile?.profileColor || '#8b5cf6';
  }

  clear(username) {
    if (username) {
      this.cache.delete(username);
    } else {
      this.cache.clear();
    }
  }
}
