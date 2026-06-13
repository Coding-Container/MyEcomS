export const validateSignup = (data) => {
  const errors = {};

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,12}$/;
  const mobileRegex = /^[6-9]\d{9}$/;

  // username
  if (!data.username) errors.username = "Username required";
  else if (!usernameRegex.test(data.username))
    errors.username = "Invalid username (3-20 chars, no spaces)";

  // email
  if (!data.email) errors.email = "Email required";
  else if (!emailRegex.test(data.email)) errors.email = "Enter valid email";

  // password
  if (!data.password) errors.password = "Password required";
  else if (!passwordRegex.test(data.password))
    errors.password = "Password must include A,a,1,@ and 6-12 chars";

  // mobile
  if (!data.mobile) {
    errors.mobile = "Mobile is required";
  } else if (!mobileRegex.test(data.mobile)) {
    errors.mobile = "Enter valid 10 digit mobile number";
  }

  return errors;
};
