export const getUser = () => {
  const user = localStorage.getItem("userInfo");
  return user ? JSON.parse(user) : null;
};

export const getToken = () => {
  return getUser()?.token;
};

export const isLoggedIn = () => {
  return !!getUser();
};

export const isAdmin = () => {
  return getUser()?.isAdmin === true;
};

export const logout = () => {
  localStorage.removeItem("userInfo");
};