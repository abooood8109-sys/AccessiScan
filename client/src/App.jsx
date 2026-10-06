import {
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router";
import { useEffect, useState } from "react";
import "./App.css";

/* =========================
   LAYOUT
========================= */

function Layout({ children }) {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="app">
      <header className="navbar">
        <Link
          to="/"
          className="logo"
        >
          AccessiScan
        </Link>

        <nav>
          <Link to="/">Home</Link>

          {!token && (
            <>
              <Link to="/login">
                Login
              </Link>

              <Link to="/register">
                Register
              </Link>
            </>
          )}

          {token && (
            <Link to="/dashboard">
              Dashboard
            </Link>
          )}

          {user?.role === "admin" && (
            <Link to="/admin">
              Admin
            </Link>
          )}

          {token && (
            <button
              className="nav-logout"
              onClick={logout}
            >
              Logout
            </button>
          )}
        </nav>
      </header>

      {children}
    </div>
  );
}

/* =========================
   LANDING PAGE
========================= */

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-content">
          <p className="tag">
            ACCESSISCAN
          </p>

          <h1>
            Scan Your Website
            <span>
              {" "}
              Make It More Accessible
            </span>
          </h1>

          <p className="description">
            Analyze a website interface and
            identify accessibility problems
            that may affect users with
            different disabilities.
          </p>

          <div className="landing-actions">
            <Link
              to="/audit"
              className="primary-button"
            >
              Continue as Guest
            </Link>

            <Link
              to="/login"
              className="secondary-button"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="secondary-button"
            >
              Create Account
            </Link>
          </div>

          <p className="landing-note">
            You can start an accessibility
            audit without creating an account.
          </p>
        </div>

        <div className="landing-card">
          <div className="landing-card-top">
            <span>
              AccessiScan Audit
            </span>

            <span className="landing-status">
              ● Ready
            </span>
          </div>

          <div className="landing-score">
            <strong>
              100
            </strong>

            <span>
              Accessibility Score
            </span>
          </div>

          <div className="landing-checks">
            <div>
              <span>
                Visual
              </span>

              <strong>
                ✓
              </strong>
            </div>

            <div>
              <span>
                Hearing
              </span>

              <strong>
                ✓
              </strong>
            </div>

            <div>
              <span>
                Motor
              </span>

              <strong>
                ✓
              </strong>
            </div>

            <div>
              <span>
                Cognitive
              </span>

              <strong>
                ✓
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-options">
        <div className="landing-option">
          <div className="landing-option-number">
            01
          </div>

          <h3>
            Continue as Guest
          </h3>

          <p>
            Audit a public website immediately
            without creating an account.
          </p>

          <Link to="/audit">
            Start Audit →
          </Link>
        </div>

        <div className="landing-option">
          <div className="landing-option-number">
            02
          </div>

          <h3>
            Login
          </h3>

          <p>
            Access your saved audits and
            previous accessibility reports.
          </p>

          <Link to="/login">
            Login →
          </Link>
        </div>

        <div className="landing-option">
          <div className="landing-option-number">
            03
          </div>

          <h3>
            Create Account
          </h3>

          <p>
            Save your audits and manage your
            accessibility reports.
          </p>

          <Link to="/register">
            Register →
          </Link>
        </div>
      </section>
    </main>
  );
}

/* =========================
   GUEST / AUDIT PAGE
========================= */

function GuestPage() {
  const [url, setUrl] = useState("");
  const [message, setMessage] =
    useState("");
  const [results, setResults] =
    useState(null);

  const handleAudit = async () => {
    if (!url.trim()) {
      setMessage(
        "Please enter a website URL."
      );

      setResults(null);
      return;
    }

    setMessage(
      "Analyzing website..."
    );

    setResults(null);

    try {
      const token =
        localStorage.getItem("token");

      const response =
        await fetch(
          "http://localhost:5000/audit",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },

            body: JSON.stringify({
              url: url.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to analyze the website."
        );

        return;
      }

      setMessage(
        data.message
      );

      setResults(
        data.results
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to connect to the server."
      );
    }
  };

  const visualIssues =
    results?.visualIssues || [];

  const hearingIssues =
    results?.hearingIssues || [];

  const motorIssues =
    results?.motorIssues || [];

  const cognitiveIssues =
    results?.cognitiveIssues || [];

  const allIssues =
    results?.allIssues || [];

  const passedRules =
    results?.axe?.passedRules || [];

  const motorInfo =
    results?.motorInfo || {
      positiveTabIndex: 0,
      nonKeyboardAccessible: 0,
      scrollableNotFocusable: 0,
    };

  return (
    <>
      <main className="hero">
        <div className="hero-content">
          <p className="tag">
            ACCESSISCAN ANALYSIS
          </p>

          <h1>
            Scan Your Website
            <span>
              {" "}
              Make It More Accessible
            </span>
          </h1>

          <p className="description">
            Analyze a website interface and
            identify accessibility problems
            that may affect users with
            different disabilities.
          </p>

          <div className="audit-box">
            <input
              type="url"
              value={url}
              onChange={(e) =>
                setUrl(
                  e.target.value
                )
              }
              placeholder="Enter website URL..."
            />

            <button
              onClick={
                handleAudit
              }
            >
              Start Audit
            </button>
          </div>

          <p className="hint">
            Guests can audit a public website
            without creating an account.
          </p>

          {message && (
            <p className="audit-message">
              {message}
            </p>
          )}
        </div>

        <div className="hero-card">
          <div className="card-header">
            <span>
              AccessiScan Audit
            </span>

            <span className="status">
              {results
                ? "● Completed"
                : "● Ready"}
            </span>
          </div>

          <div className="score-circle">
            <strong>
              {results
                ? results.score
                : "--"}
            </strong>

            <span>
              Accessibility Score
            </span>
          </div>

          <div className="checks">
            <div>
              <span>
                Accessibility Issues
              </span>

              <b>
                {results
                  ? allIssues.length
                  : "--"}
              </b>
            </div>

            <div>
              <span>
                Visual Issues
              </span>

              <b>
                {results
                  ? visualIssues.length
                  : "--"}
              </b>
            </div>

            <div>
              <span>
                Hearing Issues
              </span>

              <b>
                {results
                  ? hearingIssues.length
                  : "--"}
              </b>
            </div>

            <div>
              <span>
                Motor Issues
              </span>

              <b>
                {results
                  ? motorIssues.length
                  : "--"}
              </b>
            </div>
          </div>
        </div>
      </main>

      {results && (
        <section className="results-section">
          <div className="result-summary">
            <h2>
              AccessiScan Results
            </h2>

            <p>
              <strong>
                Website:
              </strong>{" "}
              {results.url}
            </p>

            <p>
              <strong>
                Page Title:
              </strong>{" "}
              {results.title}
            </p>

            <p>
              <strong>
                Language:
              </strong>{" "}
              {results.language}
            </p>

            <p>
              <strong>
                Images:
              </strong>{" "}
              {results.images}
            </p>

            <p>
              <strong>
                Images without ALT:
              </strong>{" "}
              {results.imagesWithoutAlt}
            </p>

            <p>
              <strong>
                Links:
              </strong>{" "}
              {results.links}
            </p>

            <p>
              <strong>
                Buttons:
              </strong>{" "}
              {results.buttons}
            </p>

            <p>
              <strong>
                Headings:
              </strong>{" "}
              {results.headings}
            </p>

            <p>
              <strong>
                Form Controls:
              </strong>{" "}
              {results.inputs}
            </p>

            <p>
              <strong>
                Videos:
              </strong>{" "}
              {results.videos}
            </p>

            <p>
              <strong>
                Audio:
              </strong>{" "}
              {results.audioElements}
            </p>

            <p>
              <strong>
                Videos without Captions:
              </strong>{" "}
              {results.videosWithoutCaptions}
            </p>

            <p>
              <strong>
                Passed Rules:
              </strong>{" "}
              {passedRules.length}
            </p>
          </div>

          <div className="category-card">
            <div className="category-header">
              <h2>
                Visual Accessibility
              </h2>

              <span>
                {visualIssues.length} issue(s)
              </span>
            </div>

            {visualIssues.length === 0 ? (
              <p>
                No visual accessibility
                violations were detected by
                the automated visual checks.
              </p>
            ) : (
              visualIssues.map(
                (issue, index) => (
                  <IssueCard
                    key={index}
                    issue={issue}
                  />
                )
              )
            )}
          </div>

          <div className="category-card">
            <div className="category-header">
              <h2>
                Hearing Accessibility
              </h2>

              <span>
                {hearingIssues.length} issue(s)
              </span>
            </div>

            <p>
              Videos: {results.videos} |
              Audio: {results.audioElements} |
              Videos without captions:{" "}
              {results.videosWithoutCaptions}
            </p>

            {hearingIssues.length ===
            0 ? (
              <p>
                No hearing accessibility
                issues were detected by the
                automated checks.
              </p>
            ) : (
              hearingIssues.map(
                (issue, index) => (
                  <IssueCard
                    key={index}
                    issue={issue}
                  />
                )
              )
            )}
          </div>

          <div className="category-card">
            <div className="category-header">
              <h2>
                Motor Accessibility
              </h2>

              <span>
                {motorIssues.length} issue(s)
              </span>
            </div>

            <p>
              Positive Tabindex:{" "}
              {motorInfo.positiveTabIndex} |
              Non-keyboard Accessible:{" "}
              {motorInfo.nonKeyboardAccessible}{" "}
              |
              Scrollable Regions without
              Focus:{" "}
              {
                motorInfo.scrollableNotFocusable
              }
            </p>

            {motorIssues.length ===
            0 ? (
              <p>
                No motor accessibility
                issues were detected by the
                automated checks.
              </p>
            ) : (
              motorIssues.map(
                (issue, index) => (
                  <IssueCard
                    key={index}
                    issue={issue}
                  />
                )
              )
            )}
          </div>

          <div className="category-card">
            <div className="category-header">
              <h2>
                Cognitive Accessibility
              </h2>

              <span>
                {cognitiveIssues.length} issue(s)
              </span>
            </div>

            <p>
              Checks page structure,
              navigation and content clarity.
            </p>

            {cognitiveIssues.length ===
            0 ? (
              <p>
                No cognitive accessibility
                issues were detected by the
                automated checks.
              </p>
            ) : (
              cognitiveIssues.map(
                (issue, index) => (
                  <IssueCard
                    key={index}
                    issue={issue}
                  />
                )
              )
            )}
          </div>

          <div className="issues">
            <h2>
              All Accessibility Issues
            </h2>

            {allIssues.length ===
            0 ? (
              <p>
                No accessibility issues
                were detected.
              </p>
            ) : (
              allIssues.map(
                (issue, index) => (
                  <IssueCard
                    key={index}
                    issue={issue}
                  />
                )
              )
            )}
          </div>
        </section>
      )}

      {!results && (
        <section className="features">
          <div>
            <h3>
              Visual Accessibility
            </h3>

            <p>
              Checks visual aspects that
              may affect users with visual
              disabilities.
            </p>
          </div>

          <div>
            <h3>
              Hearing Accessibility
            </h3>

            <p>
              Checks video and audio
              content for captions and
              subtitles.
            </p>
          </div>

          <div>
            <h3>
              Motor Accessibility
            </h3>

            <p>
              Checks keyboard access and
              interactive elements.
            </p>
          </div>

          <div>
            <h3>
              Cognitive Accessibility
            </h3>

            <p>
              Checks structure,
              navigation and content
              clarity.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

/* =========================
   ISSUE CARD
========================= */

function IssueCard({ issue }) {
  const issueTitle =
    issue.issue_type ||
    issue.type ||
    "Accessibility Issue";

  return (
    <div className="issue-card">
      <div className="issue-top">
        <h3>
          {issueTitle}
        </h3>

        <span>
          {issue.severity ||
            "Unknown"}
        </span>
      </div>

      <p>
        {issue.message ||
          "No issue description available."}
      </p>

      {issue.recommendation && (
        <small>
          <strong>
            Recommendation:
          </strong>{" "}
          {issue.recommendation}
        </small>
      )}

      {issue.helpUrl ||
      issue.help_url ? (
        <a
          href={
            issue.helpUrl ||
            issue.help_url
          }
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
      ) : null}

      {issue.affected_elements && (
        <details>
          <summary>
            Affected elements
          </summary>

          <pre>
            {issue.affected_elements}
          </pre>
        </details>
      )}

      {issue.nodes &&
        issue.nodes.length > 0 && (
          <details>
            <summary>
              Affected elements
            </summary>

            <pre>
              {JSON.stringify(
                issue.nodes,
                null,
                2
              )}
            </pre>
          </details>
        )}
    </div>
  );
}

/* =========================
   LOGIN
========================= */

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "http://localhost:5000/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email,
              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Invalid email or password."
        );

        return;
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          data.user
        )
      );

      if (
        data.user.role ===
        "admin"
      ) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="form-card">
        <p className="tag">
          USER ACCOUNT
        </p>

        <h1>
          Welcome Back
        </h1>

        <p className="description">
          Login to save your audit history
          and manage your reports.
        </p>

        <form
          onSubmit={handleLogin}
        >
          <div className="form-group">
            <label htmlFor="login-email">
              Email
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        {message && (
          <p className="form-message">
            {message}
          </p>
        )}

        <p className="form-note">
          Don't have an account?{" "}
          <Link to="/register">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

/* =========================
   REGISTER
========================= */

function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "http://localhost:5000/auth/register",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
              email,
              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to create account."
        );

        return;
      }

      setMessage(
        "Account created successfully. Redirecting..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="form-card">
        <p className="tag">
          CREATE ACCOUNT
        </p>

        <h1>
          Get Started
        </h1>

        <p className="description">
          Create an account to save and
          manage your accessibility audits.
        </p>

        <form
          onSubmit={handleRegister}
        >
          <div className="form-group">
            <label htmlFor="register-name">
              Name
            </label>

            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email">
              Email
            </label>

            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        {message && (
          <p className="form-message">
            {message}
          </p>
        )}

        <p className="form-note">
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

/* =========================
   USER DASHBOARD
========================= */

function DashboardPage() {
  const [audits, setAudits] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const user = JSON.parse(
    localStorage.getItem("user") ||
      "null"
  );

  useEffect(() => {
    const loadAudits = async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setError(
          "Please login first."
        );

        setLoading(false);
        return;
      }

      try {
        const response =
          await fetch(
            "http://localhost:5000/user/audits",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Unable to load audit history."
          );

          return;
        }

        setAudits(
          data.audits || []
        );
      } catch (error) {
        console.error(error);

        setError(
          "Unable to connect to the server."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAudits();
  }, []);

  const totalAudits =
    audits.length;

  const averageScore =
    totalAudits > 0
      ? Math.round(
          audits.reduce(
            (total, audit) =>
              total +
              Number(
                audit.score || 0
              ),
            0
          ) / totalAudits
        )
      : "--";

  const latestScore =
    audits.length > 0
      ? audits[0].score
      : "--";

  return (
    <main className="page-container">
      <div className="dashboard-header">
        <div>
          <p className="tag">
            USER DASHBOARD
          </p>

          <h1>
            Welcome,{" "}
            {user?.name || "User"}
          </h1>

          <p className="description">
            View your previous AccessiScan audits
            and accessibility reports.
          </p>
        </div>

        <Link
          to="/audit"
          className="primary-button"
        >
          New Audit
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>
            Total Audits
          </h3>

          <strong>
            {loading
              ? "..."
              : totalAudits}
          </strong>

          <p>
            Saved audits
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Average Score
          </h3>

          <strong>
            {loading
              ? "..."
              : averageScore}
          </strong>

          <p>
            Accessibility score
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Latest Score
          </h3>

          <strong>
            {loading
              ? "..."
              : latestScore}
          </strong>

          <p>
            Most recent audit
          </p>
        </div>
      </div>

      <div className="history-card">
        <h2>
          Audit History
        </h2>

        {loading && (
          <div className="empty-state">
            <p>
              Loading audit history...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        )}

        {!loading &&
          !error &&
          audits.length === 0 && (
            <div className="empty-state">
              <p>
                No saved audits yet.
              </p>

              <Link to="/audit">
                Start your first audit
              </Link>
            </div>
          )}

        {!loading &&
          !error &&
          audits.length > 0 && (
            <div className="audit-history-list">
              {audits.map(
                (audit) => (
                  <div
                    className="audit-history-item"
                    key={audit.id}
                  >
                    <div>
                      <h3>
                        {audit.page_title ||
                          "Untitled Page"}
                      </h3>

                      <p>
                        {audit.url}
                      </p>

                      <small>
                        {new Date(
                          audit.created_at
                        ).toLocaleString()}
                      </small>
                    </div>

                    <div className="audit-score">
                      <strong>
                        {audit.score}
                      </strong>

                      <span>
                        Score
                      </span>

                      <Link
                        to={`/audit/${audit.id}`}
                        className="primary-button"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </main>
  );
}

/* =========================
   AUDIT DETAILS
========================= */

function AuditDetailsPage() {
  const { id } = useParams();

  const [audit, setAudit] =
    useState(null);

  const [issues, setIssues] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadAuditDetails =
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setError(
            "Please login first."
          );

          setLoading(false);
          return;
        }

        try {
          const response =
            await fetch(
              `http://localhost:5000/audits/${id}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            setError(
              data.message ||
                "Unable to load audit details."
            );

            return;
          }

          setAudit(
            data.audit
          );

          setIssues(
            data.issues || []
          );
        } catch (error) {
          console.error(error);

          setError(
            "Unable to connect to the server."
          );
        } finally {
          setLoading(false);
        }
      };

    loadAuditDetails();
  }, [id]);

  const categories = [
    "General",
    "Visual",
    "Hearing",
    "Motor",
    "Cognitive",
    "WCAG",
  ];

  const getCategoryIssues =
    (category) =>
      issues.filter(
        (issue) =>
          issue.category ===
          category
      );

  const highCount =
    issues.filter(
      (issue) =>
        [
          "High",
          "Critical",
          "Serious",
        ].includes(
          issue.severity
        )
    ).length;

  const mediumCount =
    issues.filter(
      (issue) =>
        [
          "Medium",
          "Moderate",
        ].includes(
          issue.severity
        )
    ).length;

  const lowCount =
    issues.filter(
      (issue) =>
        [
          "Low",
          "Minor",
        ].includes(
          issue.severity
        )
    ).length;

  if (loading) {
    return (
      <main className="page-container">
        <div className="history-card">
          <p>
            Loading audit details...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <div className="form-card">
          <h1>
            Unable to Open Audit
          </h1>

          <p className="description">
            {error}
          </p>

          <Link
            to="/dashboard"
            className="primary-button"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!audit) {
    return (
      <main className="page-container">
        <div className="form-card">
          <h1>
            Audit Not Found
          </h1>

          <p className="description">
            The requested audit could not
            be found.
          </p>

          <Link
            to="/dashboard"
            className="primary-button"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="dashboard-header">
        <div>
          <p className="tag">
            ACCESSISCAN DETAILS
          </p>

          <h1>
            {audit.page_title ||
              "Untitled Page"}
          </h1>

          <p className="description">
            Full accessibility report for
            the selected AccessiScan audit.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="primary-button"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>
            Accessibility Score
          </h3>

          <strong>
            {audit.score}
          </strong>

          <p>
            Audit score
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Total Issues
          </h3>

          <strong>
            {issues.length}
          </strong>

          <p>
            Detected issues
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            High Severity
          </h3>

          <strong>
            {highCount}
          </strong>

          <p>
            High priority issues
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Medium / Low
          </h3>

          <strong>
            {mediumCount + lowCount}
          </strong>

          <p>
            Other issues
          </p>
        </div>
      </div>

      <div className="history-card">
        <h2>
          Website Information
        </h2>

        <p>
          <strong>
            URL:
          </strong>{" "}
          {audit.url}
        </p>

        <p>
          <strong>
            Page Title:
          </strong>{" "}
          {audit.page_title ||
            "Untitled Page"}
        </p>

        <p>
          <strong>
            Language:
          </strong>{" "}
          {audit.language ||
            "Not specified"}
        </p>

        <p>
          <strong>
            Audit Date:
          </strong>{" "}
          {new Date(
            audit.created_at
          ).toLocaleString()}
        </p>

        <p>
          <strong>
            Images:
          </strong>{" "}
          {audit.images}
        </p>

        <p>
          <strong>
            Images without ALT:
          </strong>{" "}
          {audit.images_without_alt}
        </p>

        <p>
          <strong>
            Links:
          </strong>{" "}
          {audit.links}
        </p>

        <p>
          <strong>
            Empty Links:
          </strong>{" "}
          {audit.empty_links}
        </p>

        <p>
          <strong>
            Buttons:
          </strong>{" "}
          {audit.buttons}
        </p>

        <p>
          <strong>
            Empty Buttons:
          </strong>{" "}
          {audit.empty_buttons}
        </p>

        <p>
          <strong>
            Form Controls:
          </strong>{" "}
          {audit.form_controls}
        </p>

        <p>
          <strong>
            Controls without Labels:
          </strong>{" "}
          {audit.controls_without_labels}
        </p>

        <p>
          <strong>
            Headings:
          </strong>{" "}
          {audit.headings}
        </p>

        <p>
          <strong>
            Videos:
          </strong>{" "}
          {audit.videos}
        </p>

        <p>
          <strong>
            Audio:
          </strong>{" "}
          {audit.audio_elements}
        </p>

        <p>
          <strong>
            Videos without Captions:
          </strong>{" "}
          {audit.videos_without_captions}
        </p>
      </div>

      {categories.map(
        (category) => {
          const categoryIssues =
            getCategoryIssues(
              category
            );

          if (
            categoryIssues.length ===
            0
          ) {
            return null;
          }

          return (
            <div
              className="category-card"
              key={category}
            >
              <div className="category-header">
                <h2>
                  {category} Accessibility
                </h2>

                <span>
                  {
                    categoryIssues.length
                  } issue(s)
                </span>
              </div>

              {categoryIssues.map(
                (issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                  />
                )
              )}
            </div>
          );
        }
      )}

      <div className="issues">
        <h2>
          All Issues
        </h2>

        {issues.length === 0 ? (
          <div className="history-card">
            <p>
              No accessibility issues were
              detected in this audit.
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
            />
          ))
        )}
      </div>
    </main>
  );
}

/* =========================
   ADMIN
========================= */

function AdminPage() {
  const [stats, setStats] =
    useState(null);

  const [users, setUsers] =
    useState([]);

  const [audits, setAudits] =
    useState([]);

  const [reports, setReports] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [usersLoading, setUsersLoading] =
    useState(false);

  const [auditsLoading, setAuditsLoading] =
    useState(false);

  const [reportsLoading, setReportsLoading] =
    useState(false);

  const [showUsers, setShowUsers] =
    useState(false);

  const [showAudits, setShowAudits] =
    useState(false);

  const [showReports, setShowReports] =
    useState(false);

  const [error, setError] =
    useState("");

  const [usersError, setUsersError] =
    useState("");

  const [auditsError, setAuditsError] =
    useState("");

  const [reportsError, setReportsError] =
    useState("");

  const user = JSON.parse(
    localStorage.getItem("user") ||
      "null"
  );

  useEffect(() => {
    const loadStats = async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setError(
          "Please login first."
        );

        setLoading(false);
        return;
      }

      try {
        const response =
          await fetch(
            "http://localhost:5000/admin/stats",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Unable to load admin statistics."
          );

          return;
        }

        setStats(data);
      } catch (error) {
        console.error(error);

        setError(
          "Unable to connect to the server."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleManageUsers =
    async () => {
      if (showUsers) {
        setShowUsers(false);
        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setUsersError(
          "Please login first."
        );

        return;
      }

      setUsersLoading(true);
      setUsersError("");

      try {
        const response =
          await fetch(
            "http://localhost:5000/admin/users",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setUsersError(
            data.message ||
              "Unable to load users."
          );

          return;
        }

        setUsers(
          data.users || []
        );

        setShowUsers(true);
      } catch (error) {
        console.error(error);

        setUsersError(
          "Unable to connect to the server."
        );
      } finally {
        setUsersLoading(false);
      }
    };

  const handleViewAudits =
    async () => {
      if (showAudits) {
        setShowAudits(false);
        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setAuditsError(
          "Please login first."
        );

        return;
      }

      setAuditsLoading(true);
      setAuditsError("");

      try {
        const response =
          await fetch(
            "http://localhost:5000/admin/audits",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setAuditsError(
            data.message ||
              "Unable to load audits."
          );

          return;
        }

        setAudits(
          data.audits || []
        );

        setShowAudits(true);
      } catch (error) {
        console.error(error);

        setAuditsError(
          "Unable to connect to the server."
        );
      } finally {
        setAuditsLoading(false);
      }
    };

  const handleSystemReports =
    async () => {
      if (showReports) {
        setShowReports(false);
        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setReportsError(
          "Please login first."
        );

        return;
      }

      setReportsLoading(true);
      setReportsError("");

      try {
        const response =
          await fetch(
            "http://localhost:5000/admin/reports",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setReportsError(
            data.message ||
              "Unable to load system reports."
          );

          return;
        }

        setReports(data);
        setShowReports(true);
      } catch (error) {
        console.error(error);

        setReportsError(
          "Unable to connect to the server."
        );
      } finally {
        setReportsLoading(false);
      }
    };

  if (
    user?.role !== "admin"
  ) {
    return (
      <main className="page-container">
        <div className="form-card">
          <h1>
            Access Denied
          </h1>

          <p className="description">
            Admin access is required to
            view this page.
          </p>

          <Link
            to="/dashboard"
            className="primary-button"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="dashboard-header">
        <div>
          <p className="tag">
            ACCESSISCAN ADMIN
          </p>

          <h1>
            System Overview
          </h1>

          <p className="description">
            Manage users, audits and
            AccessiScan system activity.
          </p>
        </div>
      </div>

      {loading && (
        <div className="history-card">
          <p>
            Loading system statistics...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="history-card">
          <p>{error}</p>
        </div>
      )}

      {!loading &&
        !error &&
        stats && (
          <>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>
                  Users
                </h3>

                <strong>
                  {stats.users}
                </strong>

                <p>
                  Registered users
                </p>
              </div>

              <div className="dashboard-card">
                <h3>
                  Total Audits
                </h3>

                <strong>
                  {stats.audits}
                </strong>

                <p>
                  Completed audits
                </p>
              </div>

              <div className="dashboard-card">
                <h3>
                  System Issues
                </h3>

                <strong>
                  {stats.issues}
                </strong>

                <p>
                  Detected accessibility issues
                </p>
              </div>

              <div className="dashboard-card">
                <h3>
                  Average Score
                </h3>

                <strong>
                  {stats.averageScore}
                </strong>

                <p>
                  Overall accessibility score
                </p>
              </div>
            </div>

            <div className="history-card">
              <h2>
                Admin Functions
              </h2>

              <div className="admin-actions">
                <button
                  onClick={
                    handleManageUsers
                  }
                  disabled={
                    usersLoading
                  }
                >
                  {usersLoading
                    ? "Loading..."
                    : showUsers
                    ? "Hide Users"
                    : "Manage Users"}
                </button>

                <button
                  onClick={
                    handleViewAudits
                  }
                  disabled={
                    auditsLoading
                  }
                >
                  {auditsLoading
                    ? "Loading..."
                    : showAudits
                    ? "Hide Audits"
                    : "View Audits"}
                </button>

                <button
                  onClick={
                    handleSystemReports
                  }
                  disabled={
                    reportsLoading
                  }
                >
                  {reportsLoading
                    ? "Loading..."
                    : showReports
                    ? "Hide Reports"
                    : "System Reports"}
                </button>
              </div>
            </div>

            {showUsers && (
              <div className="history-card">
                <h2>
                  Registered Users
                </h2>

                {usersError && (
                  <p>
                    {usersError}
                  </p>
                )}

                {!usersError &&
                  users.length === 0 && (
                    <p>
                      No users found.
                    </p>
                  )}

                {!usersError &&
                  users.length > 0 && (
                    <div className="audit-history-list">
                      {users.map(
                        (item) => (
                          <div
                            className="audit-history-item"
                            key={item.id}
                          >
                            <div>
                              <h3>
                                {item.name}
                              </h3>

                              <p>
                                {item.email}
                              </p>

                              <small>
                                Role:{" "}
                                {item.role}
                                {" • "}
                                Created:{" "}
                                {new Date(
                                  item.created_at
                                ).toLocaleString()}
                              </small>
                            </div>

                            <div className="audit-score">
                              <strong>
                                #{item.id}
                              </strong>

                              <span>
                                User ID
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            )}

            {showAudits && (
              <div className="history-card">
                <h2>
                  All AccessiScan Audits
                </h2>

                {auditsError && (
                  <p>
                    {auditsError}
                  </p>
                )}

                {!auditsError &&
                  audits.length === 0 && (
                    <p>
                      No audits found.
                    </p>
                  )}

                {!auditsError &&
                  audits.length > 0 && (
                    <div className="audit-history-list">
                      {audits.map(
                        (audit) => (
                          <div
                            className="audit-history-item"
                            key={audit.id}
                          >
                            <div>
                              <h3>
                                {audit.page_title ||
                                  "Untitled Page"}
                              </h3>

                              <p>
                                {audit.url}
                              </p>

                              <small>
                                User:{" "}
                                {audit.user_name ||
                                  "Guest"}

                                {audit.user_email
                                  ? ` (${audit.user_email})`
                                  : ""}

                                {" • "}

                                Created:{" "}
                                {new Date(
                                  audit.created_at
                                ).toLocaleString()}
                              </small>

                              <small>
                                Language:{" "}
                                {audit.language ||
                                  "Not specified"}
                              </small>
                            </div>

                            <div className="audit-score">
                              <strong>
                                {audit.score}
                              </strong>

                              <span>
                                Score
                              </span>

                              <Link
                                to={`/audit/${audit.id}`}
                                className="primary-button"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            )}

            {showReports && (
              <div className="history-card">
                <h2>
                  AccessiScan System Reports
                </h2>

                {reportsError && (
                  <p>
                    {reportsError}
                  </p>
                )}

                {!reportsError &&
                  reports && (
                    <>
                      <div className="dashboard-grid">
                        <div className="dashboard-card">
                          <h3>
                            Users
                          </h3>

                          <strong>
                            {
                              reports.summary.users
                            }
                          </strong>

                          <p>
                            Registered users
                          </p>
                        </div>

                        <div className="dashboard-card">
                          <h3>
                            Audits
                          </h3>

                          <strong>
                            {
                              reports.summary.audits
                            }
                          </strong>

                          <p>
                            Total website audits
                          </p>
                        </div>

                        <div className="dashboard-card">
                          <h3>
                            Issues
                          </h3>

                          <strong>
                            {
                              reports.summary.issues
                            }
                          </strong>

                          <p>
                            Total detected issues
                          </p>
                        </div>

                        <div className="dashboard-card">
                          <h3>
                            Average Score
                          </h3>

                          <strong>
                            {
                              reports.summary.averageScore
                            }
                          </strong>

                          <p>
                            Average audit score
                          </p>
                        </div>
                      </div>

                      <div className="report-section">
                        <h3>
                          Issues by Category
                        </h3>

                        {reports.categories
                          .length === 0 ? (
                          <p>
                            No category data available.
                          </p>
                        ) : (
                          reports.categories.map(
                            (item, index) => (
                              <div
                                className="report-row"
                                key={index}
                              >
                                <span>
                                  {item.category}
                                </span>

                                <strong>
                                  {item.total}
                                </strong>
                              </div>
                            )
                          )
                        )}
                      </div>

                      <div className="report-section">
                        <h3>
                          Issues by Severity
                        </h3>

                        {reports.severity
                          .length === 0 ? (
                          <p>
                            No severity data available.
                          </p>
                        ) : (
                          reports.severity.map(
                            (item, index) => (
                              <div
                                className="report-row"
                                key={index}
                              >
                                <span>
                                  {item.severity}
                                </span>

                                <strong>
                                  {item.total}
                                </strong>
                              </div>
                            )
                          )
                        )}
                      </div>

                      <div className="report-section">
                        <h3>
                          Most Audited Websites
                        </h3>

                        {reports.topWebsites
                          .length === 0 ? (
                          <p>
                            No website data available.
                          </p>
                        ) : (
                          reports.topWebsites.map(
                            (item, index) => (
                              <div
                                className="audit-history-item"
                                key={index}
                              >
                                <div>
                                  <h3>
                                    {item.url}
                                  </h3>

                                  <p>
                                    Audits:{" "}
                                    {
                                      item.total_audits
                                    }
                                  </p>
                                </div>

                                <div className="audit-score">
                                  <strong>
                                    {
                                      item.average_score
                                    }
                                  </strong>

                                  <span>
                                    Avg Score
                                  </span>
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </>
                  )}
              </div>
            )}
          </>
        )}
    </main>
  );
}

/* =========================
   ROUTES
========================= */

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <LandingPage />
          </Layout>
        }
      />

      <Route
        path="/audit"
        element={
          <Layout>
            <GuestPage />
          </Layout>
        }
      />

      <Route
        path="/login"
        element={
          <Layout>
            <LoginPage />
          </Layout>
        }
      />

      <Route
        path="/register"
        element={
          <Layout>
            <RegisterPage />
          </Layout>
        }
      />

      <Route
        path="/dashboard"
        element={
          <Layout>
            <DashboardPage />
          </Layout>
        }
      />

      <Route
        path="/audit/:id"
        element={
          <Layout>
            <AuditDetailsPage />
          </Layout>
        }
      />

      <Route
        path="/admin"
        element={
          <Layout>
            <AdminPage />
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;