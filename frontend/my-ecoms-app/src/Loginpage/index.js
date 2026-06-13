import { useState, useEffect } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./index.css";
import { validateSignup } from "./validation";

const Loginpage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");

  const [loading, setLoading] = useState(false);

  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  const [timer, setTimer] = useState(60);
  const [resendCount, setResendCount] = useState(0);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");

  const [forgotOtp, setForgotOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [otpVerified, setOtpVerified] = useState(false);

  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  const [forgotTimer, setForgotTimer] = useState(30);

  const navigate = useNavigate();

  useEffect(() => {
    if (!showOtpScreen) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showOtpScreen, resendCount]);

  useEffect(() => {
    if (showOtpScreen && timer === 0 && resendCount >= 2) {
      toast.error("Verification expired");

      setShowOtpScreen(false);

      setOtp("");

      setUsername("");
      setEmail("");
      setPassword("");
      setMobile("");
    }
  }, [timer, resendCount, showOtpScreen]);

  useEffect(() => {
    if (!showForgotPassword || !forgotOtpSent || forgotTimer <= 0) return;

    const interval = setInterval(() => {
      setForgotTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [forgotOtpSent, forgotTimer, showForgotPassword]);

  const verifyOtp = async () => {
    try {
      setLoading(true);

      await api.post("/api/users/verify-otp", {
        email: otpEmail,
        otp,
      });

      toast.success("Account created successfully");

      setOtp("");
      setShowOtpScreen(false);

      setUsername("");
      setEmail("");
      setPassword("");
      setMobile("");

      setIsLogin(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      await api.post("/api/users/resend-otp", {
        email: otpEmail,
      });

      toast.success("OTP resent");

      setResendCount((prev) => prev + 1);

      setTimer(30);
    } catch (err) {
      toast.error(err.response?.data?.message);
    }
  };

  const onSignUpSubmit = async (e) => {
    e.preventDefault();

    const errors = validateSignup({
      username,
      email,
      password,
      mobile,
    });

    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0]);
      return;
    }

    try {
      setLoading(true);

      await api.post("/api/users/signup", {
        username,
        email,
        password,
        mobile: "+91" + mobile,
      });

      toast.success("OTP sent to your email");

      setOtpEmail(email);

      setShowOtpScreen(true);

      setTimer(60);

      setResendCount(0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const onLoginSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data } = await api.post("/api/users/login", {
        email,
        password,
      });

      localStorage.setItem("userInfo", JSON.stringify(data));

      toast.success("Welcome back 👋");

      setEmail("");
      setPassword("");
      setForgotOtpSent(false);
      setForgotTimer(30);

      if (data.isAdmin) navigate("/admin/home");
      else navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const sendForgotOtp = async () => {
    try {
      setLoading(true);

      await api.post("/api/users/forgot-password", {
        email: forgotEmail,
      });

      toast.success("OTP sent to email");
      setForgotOtpSent(true);
      setForgotTimer(30);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyForgotOtp = async () => {
    try {
      setLoading(true);

      await api.post("/api/users/verify-reset-otp", {
        email: forgotEmail,
        otp: forgotOtp,
      });

      toast.success("OTP verified");

      setOtpVerified(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    try {
      setLoading(true);

      await api.post("/api/users/reset-password", {
        email: forgotEmail,
        password: newPassword,
      });

      toast.success("Password updated");

      setShowForgotPassword(false);

      setForgotEmail("");
      setForgotOtp("");
      setNewPassword("");

      setOtpVerified(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card fade-in">
        <div className="auth-left">
          <h1>MyEcoms</h1>
          <p>Simple. Fast. Secure Shopping Experience</p>
        </div>

        <div className="auth-right">
          {showForgotPassword ? (
            <div className="forgot-container">
              <h2>Reset Password</h2>

              <input
                type="email"
                placeholder="Enter Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />

              {!otpVerified && (
                <>
                  {!forgotOtpSent ? (
                    <button onClick={sendForgotOtp} disabled={loading}>
                      Send OTP
                    </button>
                  ) : forgotTimer > 0 ? (
                    <button disabled>Resend in {forgotTimer}s</button>
                  ) : (
                    <button className="resend-btn" onClick={sendForgotOtp}>
                      Resend OTP
                    </button>
                  )}

                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={verifyForgotOtp}
                    disabled={loading}
                  >
                    Verify OTP
                  </button>
                </>
              )}

              {otpVerified && (
                <>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={resetPassword}
                    disabled={loading}
                  >
                    Update Password
                  </button>
                </>
              )}

              <p
                className="back-login"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail("");
                  setForgotOtp("");
                  setNewPassword("");
                  setOtpVerified(false);
                }}
              >
                Back To Login
              </p>
            </div>
          ) : showOtpScreen ? (
            <div className="otp-container">
              <h2>Verify Your Email</h2>

              <p>
                OTP sent to <strong>{otpEmail}</strong>
              </p>

              <input
                type="text"
                placeholder="Enter 6 Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />

              <p className="otp-timer">
                {timer > 0 ? `OTP expires in ${timer}s` : "OTP Expired"}
              </p>

              {timer > 0 && (
                <button onClick={verifyOtp} disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              )}

              {timer === 0 && resendCount < 2 && (
                <button className="resend-btn" onClick={resendOtp}>
                  Resend OTP
                </button>
              )}

              <p
                className="back-login"
                onClick={() => {
                  setShowOtpScreen(false);
                  setOtp("");
                  setTimer(60);
                }}
              >
                Back to Signup
              </p>
            </div>
          ) : isLogin ? (
            <form onSubmit={onLoginSubmit}>
              <h2>Sign in</h2>

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button disabled={loading}>
                {loading ? "Loading..." : "Login"}
              </button>
              <div className="login-links">
                <p onClick={() => setIsLogin(false)}>Create account</p>

                <p
                  className="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={onSignUpSubmit}>
              <h2>Create account</h2>

              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                placeholder="Mobile +91XXXXXXXXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button disabled={loading}>
                {loading ? "Sending OTP..." : "Signup"}
              </button>

              <p onClick={() => setIsLogin(true)}>
                Already have account? Sign in
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Loginpage;
